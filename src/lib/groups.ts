import { z } from 'zod';
import { randomUUID } from 'node:crypto';

import { audit, serial } from './audit';
import { membership, fundAccess, managers, writers } from './policy';
import { ensure } from './errors';
import { groupInput, fundInput, roles, money, date, text } from './validation';
import { hash, randomToken } from './auth';

export async function createGroup(userId: string, input: unknown) {
  const data = groupInput.parse(input);
  return serial(async (client) => {
    const group = await client.group.create({
      data: {
        ...data,
        code: 'GR-' + randomUUID().slice(0, 8).toUpperCase(),
        members: { create: { userId, code: 'TV001', roles: ['OWNER'] } },
      },
    });
    await audit(client, userId, group.id, 'GROUP_CREATED', group.id, { name: group.name });
    return group;
  });
}
export async function saveFund(userId: string, input: unknown, id?: string) {
  if (id) {
    const data = fundInput.omit({ groupId: true }).partial().parse(input);
    for (const key of Object.keys(data) as (keyof typeof data)[])
      if (!Object.prototype.hasOwnProperty.call(input, key)) delete data[key];
    return serial(async (client) => {
      const { fund } = await fundAccess(userId, id, managers, client);
      if (data.dualControl !== undefined && data.dualControl !== fund.dualControl)
        await membership(userId, fund.groupId, ['OWNER'], client);
      const updated = await client.fund.update({ where: { id }, data });
      await audit(client, userId, fund.groupId, 'FUND_UPDATED', id, { fields: Object.keys(data) });
      return updated;
    });
  }
  const data = fundInput.parse(input);
  return serial(async (client) => {
    await membership(userId, data.groupId, managers, client);
    if (!data.dualControl) await membership(userId, data.groupId, ['OWNER'], client);
    const fund = await client.fund.create({ data });
    await client.category.createMany({
      data: [
        { name: 'Đóng góp thành viên', type: 'INCOME' as const },
        { name: 'Tài trợ', type: 'INCOME' as const },
        { name: 'Hoạt động & sự kiện', type: 'EXPENSE' as const },
        { name: 'Thiện nguyện', type: 'EXPENSE' as const },
        { name: 'Vận hành', type: 'EXPENSE' as const },
      ].map((c) => ({ ...c, fundId: fund.id })),
    });
    await audit(client, userId, data.groupId, 'FUND_CREATED', fund.id, { name: fund.name });
    return fund;
  });
}
export async function addMember(userId: string, groupId: string, input: unknown) {
  const data = z
    .object({ email: z.email().toLowerCase(), roles, code: z.string().max(30).optional() })
    .parse(input);
  return serial(async (client) => {
    await membership(userId, groupId, ['OWNER'], client);
    const user = await client.user.findUnique({ where: { email: data.email } });
    ensure(
      user && !user.disabled,
      'NOT_FOUND',
      'Tài khoản chưa tồn tại. Hãy tạo liên kết mời thành viên.',
      404,
    );
    const member = await client.groupMember.create({
      data: {
        groupId,
        userId: user.id,
        code: data.code || 'TV' + randomUUID().slice(0, 8).toUpperCase(),
        roles: data.roles,
      },
    });
    await audit(client, userId, groupId, 'MEMBER_ADDED', member.id, { roles: data.roles });
    return member;
  });
}
export async function updateMember(userId: string, groupId: string, id: string, input: unknown) {
  const data = z
    .object({
      roles: roles.optional(),
      active: z.boolean().optional(),
      approvalLimit: money.nullable().optional(),
      publicName: z.string().min(1).max(100).optional(),
      publicConsent: z.boolean().optional(),
      phone: z.string().max(30).optional(),
      notes: z.string().max(1000).optional(),
    })
    .parse(input);
  return serial(async (client) => {
    const actor = await membership(userId, groupId, undefined, client);
    const target = await client.groupMember.findUnique({ where: { id } });
    ensure(target?.groupId === groupId, 'NOT_FOUND', 'Không tìm thấy thành viên.', 404);
    if (data.publicName !== undefined || data.publicConsent !== undefined)
      ensure(
        target.userId === userId,
        'FORBIDDEN',
        'Chỉ chính thành viên được đồng ý công khai danh tính của mình.',
        403,
      );
    if (
      data.roles ||
      data.active !== undefined ||
      data.approvalLimit !== undefined ||
      data.notes !== undefined
    )
      ensure(
        actor.roles.includes('OWNER'),
        'FORBIDDEN',
        'Chỉ chủ nhóm quản lý vai trò và hạn mức.',
        403,
      );
    else
      ensure(
        target.userId === userId,
        'FORBIDDEN',
        'Thành viên tự lựa chọn thông tin công khai của mình.',
        403,
      );
    if (
      target.roles.includes('OWNER') &&
      (data.active === false || (data.roles && !data.roles.includes('OWNER')))
    ) {
      const owners = await client.groupMember.count({
        where: { groupId, active: true, roles: { has: 'OWNER' }, id: { not: id } },
      });
      ensure(owners > 0, 'CONFLICT', 'Nhóm phải có ít nhất một chủ sở hữu đang hoạt động.', 409);
    }
    const member = await client.groupMember.update({ where: { id }, data });
    await audit(client, userId, groupId, 'MEMBER_UPDATED', id, { fields: Object.keys(data) });
    return member;
  });
}
export async function inviteMember(userId: string, groupId: string, input: unknown) {
  const data = z.object({ email: z.email().toLowerCase(), roles }).parse(input);
  const token = randomToken();
  return serial(async (client) => {
    await membership(userId, groupId, ['OWNER'], client);
    const invitation = await client.groupInvitation.create({
      data: {
        groupId,
        ...data,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    await audit(client, userId, groupId, 'MEMBER_INVITED', invitation.id);
    return {
      id: invitation.id,
      link: `${process.env.APP_URL}/invite?token=${token}`,
      expiresAt: invitation.expiresAt,
    };
  });
}
export async function acceptInvitation(userId: string, token: string) {
  return serial(async (client) => {
    const user = await client.user.findUniqueOrThrow({ where: { id: userId } });
    const invitation = await client.groupInvitation.findUnique({
      where: { tokenHash: hash(token) },
      include: { group: { select: { active: true } } },
    });
    ensure(
      invitation &&
        invitation.group.active &&
        !invitation.acceptedAt &&
        invitation.expiresAt > new Date() &&
        invitation.email === user.email,
      'FORBIDDEN',
      'Lời mời không hợp lệ, đã hết hạn hoặc không dành cho email này.',
      403,
    );
    const member = await client.groupMember.create({
      data: {
        groupId: invitation.groupId,
        userId,
        code: 'TV' + randomUUID().slice(0, 8),
        roles: invitation.roles,
      },
    });
    await client.groupInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    await audit(client, userId, invitation.groupId, 'INVITATION_ACCEPTED', member.id);
    return member;
  });
}
export async function createPeriod(userId: string, input: unknown) {
  const data = z
    .object({
      fundId: text,
      name: text,
      frequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'CAMPAIGN', 'EVENT']).default('MONTHLY'),
      startAt: date,
      dueAt: date,
      standardAmount: money,
      memberIds: z.array(text).min(1).max(1000),
    })
    .parse(input);
  ensure(data.dueAt >= data.startAt, 'VALIDATION_ERROR', 'Hạn đóng phải sau ngày bắt đầu.');
  return serial(async (client) => {
    const { fund } = await fundAccess(userId, data.fundId, managers, client);
    const memberIds = [...new Set(data.memberIds)];
    const members = await client.groupMember.count({
      where: { id: { in: memberIds }, groupId: fund.groupId, active: true },
    });
    ensure(
      members === memberIds.length,
      'VALIDATION_ERROR',
      'Danh sách thành viên không thuộc nhóm.',
    );
    const { memberIds: _, ...fields } = data;
    void _;
    const period = await client.fundPeriod.create({
      data: {
        ...fields,
        dues: { create: memberIds.map((memberId) => ({ memberId, amount: data.standardAmount })) },
      },
    });
    await audit(client, userId, fund.groupId, 'PERIOD_CREATED', period.id, { members: members });
    return period;
  });
}
export async function setPeriodClosed(userId: string, periodId: string, input: unknown) {
  const { closed } = z.object({ closed: z.boolean() }).parse(input);
  return serial(async (client) => {
    const period = await client.fundPeriod.findUnique({ where: { id: periodId } });
    ensure(period, 'NOT_FOUND', 'Không tìm thấy kỳ đóng.', 404);
    const { fund } = await fundAccess(userId, period.fundId, managers, client);
    const updated = await client.fundPeriod.update({ where: { id: periodId }, data: { closed } });
    await audit(client, userId, fund.groupId, 'PERIOD_STATUS_CHANGED', periodId, {
      before: period.closed,
      closed,
    });
    return updated;
  });
}
export async function adjustDue(userId: string, periodId: string, input: unknown) {
  const data = z
    .object({
      dueId: text,
      amount: z
        .string()
        .regex(/^-?\d+$/)
        .transform(BigInt),
      reason: text,
    })
    .parse(input);
  return serial(async (client) => {
    const due = await client.memberDue.findUnique({
      where: { id: data.dueId },
      include: { period: true, adjustments: true },
    });
    ensure(due?.periodId === periodId, 'NOT_FOUND', 'Không tìm thấy nghĩa vụ.', 404);
    const { fund } = await fundAccess(userId, due.period.fundId, writers, client);
    ensure(
      !due.period.closed,
      'CONFLICT',
      'Kỳ đóng đã khóa. Người quản lý cần mở lại trước khi điều chỉnh.',
      409,
    );
    const total = due.amount + due.adjustments.reduce((s, a) => s + a.amount, 0n) + data.amount;
    ensure(
      total >= 0n && total <= 1_000_000_000_000n,
      'VALIDATION_ERROR',
      'Nghĩa vụ sau điều chỉnh không hợp lệ.',
    );
    const adjustment = await client.dueAdjustment.create({ data: { ...data, actorId: userId } });
    await audit(client, userId, fund.groupId, 'DUE_ADJUSTED', adjustment.id, {
      amount: data.amount.toString(),
      reason: data.reason,
    });
    return adjustment;
  });
}
