import { z } from 'zod';
import { randomUUID } from 'node:crypto';

import { ensure } from './errors';
import { audit, notifyGroup, serial } from './audit';
import { fundAccess, membership, writers, approvers, type Database } from './policy';
import { transactionInput } from './validation';
import { journal, sum } from './money';
import { hash } from './auth';

export async function balance(client: Database, fundId: string) {
  const aggregate = await client.ledgerEntry.aggregate({
    where: { fundId, account: 'CASH', transaction: { status: 'POSTED' } },
    _sum: { amount: true },
  });
  return aggregate._sum.amount ?? 0n;
}
async function lockedTransaction(client: Database, id: string) {
  await client.$queryRaw`SELECT id FROM "Transaction" WHERE id=${id} FOR UPDATE`;
  const transaction = await client.transaction.findUnique({
    where: { id },
    include: {
      fund: true,
      entries: true,
      approvals: true,
      attachments: true,
      reversalOf: { include: { entries: true } },
    },
  });
  ensure(transaction, 'NOT_FOUND', 'Không tìm thấy giao dịch.', 404);
  return transaction;
}
function requestHash(value: unknown) {
  return hash(JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));
}
async function existingKey(
  client: Database,
  userId: string,
  key: string,
  scope: string,
  payload: unknown,
) {
  ensure(
    key.length >= 8 && key.length <= 160,
    'VALIDATION_ERROR',
    'Cần Idempotency-Key từ 8–160 ký tự.',
  );
  const record = await client.idempotencyRecord.findUnique({
    where: { actorId_scope_key: { actorId: userId, scope, key } },
  });
  if (record)
    ensure(
      record.requestHash === requestHash(payload),
      'IDEMPOTENCY_CONFLICT',
      'Mã yêu cầu đã dùng với nội dung khác.',
      409,
    );
  return record;
}
export async function createTransaction(userId: string, input: unknown, key: string) {
  const data = transactionInput.parse(input);
  return serial(async (client) => {
    const { fund } = await fundAccess(userId, data.fundId, writers, client);
    ensure(fund.active, 'CONFLICT', 'Quỹ đã ngừng hoạt động.', 409);
    const existing = await existingKey(client, userId, key, 'transaction', data);
    if (existing)
      return client.transaction.findUniqueOrThrow({ where: { id: existing.resourceId } });
    if (data.type === 'TRANSFER') {
      ensure(
        data.targetFundId && data.targetFundId !== fund.id,
        'VALIDATION_ERROR',
        'Chọn quỹ nhận khác quỹ nguồn.',
      );
      const target = await fundAccess(userId, data.targetFundId, writers, client);
      ensure(
        target.fund.groupId === fund.groupId && target.fund.active,
        'FORBIDDEN',
        'Chỉ chuyển giữa các quỹ đang hoạt động cùng nhóm.',
        403,
      );
    } else ensure(!data.targetFundId, 'VALIDATION_ERROR', 'Giao dịch này không có quỹ nhận.');
    if (data.categoryId) {
      const category = await client.category.findUnique({ where: { id: data.categoryId } });
      ensure(
        category?.fundId === fund.id && category.type === data.type,
        'VALIDATION_ERROR',
        'Danh mục không hợp lệ.',
      );
    }
    if (data.contributorId) {
      const member = await client.groupMember.findUnique({ where: { id: data.contributorId } });
      ensure(
        member?.groupId === fund.groupId && member.active && data.type === 'INCOME',
        'VALIDATION_ERROR',
        'Người đóng góp không hợp lệ.',
      );
    }
    const tx = await client.transaction.create({
      data: { ...data, code: 'DQ-' + randomUUID().slice(0, 12).toUpperCase(), createdById: userId },
    });
    await client.idempotencyRecord.create({
      data: {
        actorId: userId,
        key,
        scope: 'transaction',
        requestHash: requestHash(data),
        resourceId: tx.id,
      },
    });
    await audit(client, userId, fund.groupId, 'TRANSACTION_CREATED', tx.id, {
      type: tx.type,
      amount: tx.amount.toString(),
    });
    return tx;
  });
}
export async function transition(userId: string, id: string, action: string, reason = '') {
  return serial(async (client) => {
    const tx = await lockedTransaction(client, id);
    const member = await membership(
      userId,
      tx.fund.groupId,
      action === 'approve' || action === 'reject' ? approvers : writers,
      client,
    );
    if (action === 'submit') {
      ensure(tx.status === 'DRAFT', 'CONFLICT', 'Chỉ gửi duyệt giao dịch nháp.', 409);
      ensure(
        tx.type !== 'OPENING' || tx.attachments.length > 0,
        'VALIDATION_ERROR',
        'Số dư đầu kỳ cần chứng từ.',
      );
      await client.transaction.update({ where: { id }, data: { status: 'PENDING_APPROVAL' } });
    } else if (action === 'approve' || action === 'reject') {
      ensure(
        tx.status === 'PENDING_APPROVAL',
        'CONFLICT',
        'Giao dịch không ở trạng thái chờ duyệt.',
        409,
      );
      ensure(
        !tx.fund.dualControl || tx.createdById !== userId,
        'FORBIDDEN',
        'Quỹ yêu cầu người tạo và người duyệt khác nhau.',
        403,
      );
      ensure(
        !member.approvalLimit || tx.amount <= member.approvalLimit,
        'FORBIDDEN',
        'Giao dịch vượt hạn mức phê duyệt của bạn.',
        403,
      );
      if (action === 'reject')
        ensure(
          reason.trim().length >= 3 && reason.length <= 1000,
          'VALIDATION_ERROR',
          'Cần lý do từ chối (3–1000 ký tự).',
        );
      await client.approval.create({
        data: { transactionId: id, userId, action: action.toUpperCase(), reason },
      });
      await client.transaction.update({
        where: { id },
        data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED' },
      });
    } else if (action === 'post') {
      if (tx.status === 'POSTED') return tx;
      ensure(tx.status === 'APPROVED', 'CONFLICT', 'Chỉ ghi sổ giao dịch đã được duyệt.', 409);
      ensure(
        tx.approvals.some(
          (a) => a.action === 'APPROVE' && (!tx.fund.dualControl || a.userId !== tx.createdById),
        ),
        'FORBIDDEN',
        'Thiếu phê duyệt hợp lệ.',
        403,
      );
      const entries =
        tx.type === 'REVERSAL'
          ? tx.reversalOf!.entries.map((e) => ({
              fundId: e.fundId,
              account: e.account,
              amount: -e.amount,
            }))
          : journal(tx.type, tx.amount, tx.fundId, tx.targetFundId);
      ensure(
        entries.length >= 2 && sum(entries.map((e) => e.amount)) === 0n,
        'CONFLICT',
        'Bút toán không cân bằng.',
        409,
      );
      const fundIds = [...new Set(entries.map((e) => e.fundId))].sort();
      for (const fundId of fundIds) {
        await client.$queryRaw`SELECT id FROM "Fund" WHERE id=${fundId} FOR UPDATE`;
        const access = await fundAccess(userId, fundId, writers, client);
        ensure(access.fund.active, 'CONFLICT', 'Không thể ghi sổ vào quỹ đã ngừng hoạt động.', 409);
        const delta = sum(
          entries.filter((e) => e.fundId === fundId && e.account === 'CASH').map((e) => e.amount),
        );
        ensure(
          (await balance(client, fundId)) + delta >= 0n,
          'INSUFFICIENT_FUNDS',
          'Số dư quỹ không đủ để ghi sổ giao dịch này.',
          409,
        );
      }
      await client.ledgerEntry.createMany({
        data: entries.map((e) => ({ ...e, transactionId: id })),
      });
      await client.transaction.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date() },
      });
    } else ensure(false, 'NOT_FOUND', 'Thao tác không tồn tại.', 404);
    await audit(client, userId, tx.fund.groupId, 'TRANSACTION_' + action.toUpperCase(), id, {
      previous: tx.status,
      reason,
    });
    await notifyGroup(
      client,
      tx.fund.groupId,
      action === 'post'
        ? 'Giao dịch đã ghi sổ'
        : action === 'submit'
          ? 'Có giao dịch chờ duyệt'
          : 'Cập nhật giao dịch',
      `${tx.code} · ${tx.description}`,
    );
    return client.transaction.findUniqueOrThrow({ where: { id } });
  });
}
export async function reverseTransaction(userId: string, id: string, reason: string, key: string) {
  ensure(
    reason.trim().length >= 3 && reason.length <= 500,
    'VALIDATION_ERROR',
    'Nhập lý do hoàn tiền/đảo giao dịch.',
  );
  return serial(async (client) => {
    const original = await lockedTransaction(client, id);
    await membership(userId, original.fund.groupId, writers, client);
    const existing = await existingKey(client, userId, key, 'reverse', { id, reason });
    if (existing)
      return client.transaction.findUniqueOrThrow({ where: { id: existing.resourceId } });
    ensure(
      original.status === 'POSTED' && original.type !== 'REVERSAL',
      'CONFLICT',
      'Chỉ đảo giao dịch đã ghi sổ, không đảo giao dịch đảo.',
      409,
    );
    ensure(
      !(await client.transaction.findUnique({ where: { reversalOfId: id } })),
      'CONFLICT',
      'Giao dịch này đã có yêu cầu đảo.',
      409,
    );
    const reversed = await client.transaction.create({
      data: {
        fundId: original.fundId,
        targetFundId: original.targetFundId,
        type: 'REVERSAL',
        amount: original.amount,
        description: reason,
        publicDescription: original.isPublic
          ? 'Hoàn/điều chỉnh: ' + original.publicDescription
          : '',
        isPublic: original.isPublic,
        createdById: userId,
        occurredAt: new Date(),
        reversalOfId: id,
        code: 'DQ-' + randomUUID().slice(0, 12).toUpperCase(),
      },
    });
    await client.idempotencyRecord.create({
      data: {
        actorId: userId,
        key,
        scope: 'reverse',
        requestHash: requestHash({ id, reason }),
        resourceId: reversed.id,
      },
    });
    await audit(client, userId, original.fund.groupId, 'REVERSAL_CREATED', reversed.id, {
      originalId: id,
      reason,
    });
    return reversed;
  });
}
export async function updateDraft(userId: string, id: string, input: unknown) {
  const data = z
    .object({
      description: z.string().trim().min(1).max(500),
      publicDescription: z.string().max(500),
      isPublic: z.boolean(),
    })
    .parse(input);
  ensure(
    !data.isPublic || data.publicDescription.trim(),
    'VALIDATION_ERROR',
    'Cần nội dung công khai.',
  );
  return serial(async (client) => {
    const tx = await lockedTransaction(client, id);
    await membership(userId, tx.fund.groupId, writers, client);
    ensure(
      tx.status === 'DRAFT',
      'CONFLICT',
      'Chỉ được chỉnh giao dịch nháp. Giao dịch đã ghi sổ phải tạo bút toán đảo.',
      409,
    );
    const updated = await client.transaction.update({ where: { id }, data });
    await audit(client, userId, tx.fund.groupId, 'DRAFT_UPDATED', id, {
      description: data.description,
    });
    return updated;
  });
}
export async function allocateContribution(userId: string, input: unknown) {
  const data = z
    .object({ transactionId: z.string(), dueId: z.string(), amount: z.coerce.bigint().positive() })
    .parse(input);
  return serial(async (client) => {
    const tx = await lockedTransaction(client, data.transactionId);
    await membership(userId, tx.fund.groupId, writers, client);
    ensure(
      tx.type === 'INCOME' && tx.status === 'POSTED',
      'CONFLICT',
      'Chỉ phân bổ khoản thu đã ghi sổ.',
      409,
    );
    const reversed = await client.transaction.findUnique({ where: { reversalOfId: tx.id } });
    ensure(!reversed, 'CONFLICT', 'Giao dịch đang/đã hoàn tiền không thể phân bổ.', 409);
    const due = await client.memberDue.findUnique({
      where: { id: data.dueId },
      include: {
        period: true,
        member: true,
        adjustments: true,
        allocations: { include: { transaction: { include: { reversedBy: true } } } },
      },
    });
    ensure(
      due && due.period.fundId === tx.fundId && due.memberId === tx.contributorId,
      'VALIDATION_ERROR',
      'Nghĩa vụ phải cùng quỹ và người đóng góp.',
    );
    ensure(
      !due.period.closed,
      'CONFLICT',
      'Kỳ đóng đã khóa. Người quản lý cần mở lại trước khi phân bổ.',
      409,
    );
    const used = await client.contributionAllocation.aggregate({
      where: { transactionId: tx.id },
      _sum: { amount: true },
    });
    ensure(
      (used._sum.amount ?? 0n) + data.amount <= tx.amount,
      'CONFLICT',
      'Phân bổ vượt số tiền thực nhận.',
      409,
    );
    const allocation = await client.contributionAllocation.create({ data });
    await audit(client, userId, tx.fund.groupId, 'CONTRIBUTION_ALLOCATED', allocation.id, {
      amount: data.amount.toString(),
    });
    const required = due.amount + sum(due.adjustments.map((a) => a.amount));
    const received = sum(
      due.allocations
        .filter(
          (a) => a.transaction.status === 'POSTED' && a.transaction.reversedBy?.status !== 'POSTED',
        )
        .map((a) => a.amount),
    );
    if (received < required && received + data.amount >= required)
      await client.notification.createMany({
        data: [
          {
            id: 'due-completed-' + due.id,
            userId: due.member.userId,
            title: 'Bạn đã hoàn thành đóng quỹ',
            body: `${due.period.name}: khoản đóng góp đã được ghi nhận đầy đủ.`,
            href: '/dashboard/contributions',
          },
        ],
        skipDuplicates: true,
      });
    return allocation;
  });
}
