import { db } from './db';
import { Prisma } from '@/generated/prisma/client';
import { fundAccess, membership, visibleFund, type Database } from './policy';
import { ensure } from './errors';
import { dueSummary } from './money';
import { pagination, dates } from './validation';

export function publicFundDTO(fund: Awaited<ReturnType<typeof visibleFund>>) {
  return {
    id: fund.id,
    name: fund.name,
    slug: fund.slug,
    description: fund.description,
    purpose: fund.purpose,
    type: fund.type,
    visibility: fund.visibility,
    allowIndex: fund.allowIndex,
    showSummary: fund.showSummary,
    showContributors: fund.showContributors,
    allowExport: fund.allowExport,
    goalAmount: fund.goalAmount,
    publicManager: fund.publicManager,
    createdAt: fund.createdAt,
    group: fund.group,
    categories: fund.categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
    bank: fund.bankPublicConsent
      ? {
          bin: fund.bankBin,
          name: fund.bankName,
          account: fund.bankAccount,
          holder: fund.bankHolder,
        }
      : null,
  };
}
export async function statistics(fundId: string, start?: Date, end?: Date) {
  return db.$transaction((client) => statisticsSnapshot(client, fundId, start, end), {
    isolationLevel: 'RepeatableRead',
  });
}
async function statisticsSnapshot(client: Database, fundId: string, start?: Date, end?: Date) {
  const cutoff = end ?? new Date();
  const totals = await client.$queryRaw<
    {
      opening: bigint;
      closing: bigint;
      income: bigint;
      expense: bigint;
      transfers: bigint;
      openingAdded: bigint;
      count: bigint;
      updatedAt: Date | null;
    }[]
  >(Prisma.sql`
    SELECT COALESCE(SUM(e.amount) FILTER (WHERE t."occurredAt" < ${start ?? new Date(0)}),0)::bigint opening,
      COALESCE(SUM(e.amount),0)::bigint closing,
      COALESCE(SUM(e.amount) FILTER (WHERE t."occurredAt">=${start ?? new Date(0)} AND COALESCE(r.type,t.type)='INCOME'),0)::bigint income,
      COALESCE(-SUM(e.amount) FILTER (WHERE t."occurredAt">=${start ?? new Date(0)} AND COALESCE(r.type,t.type)='EXPENSE'),0)::bigint expense,
      COALESCE(SUM(e.amount) FILTER (WHERE t."occurredAt">=${start ?? new Date(0)} AND COALESCE(r.type,t.type)='TRANSFER'),0)::bigint transfers,
      COALESCE(SUM(e.amount) FILTER (WHERE t."occurredAt">=${start ?? new Date(0)} AND COALESCE(r.type,t.type)='OPENING'),0)::bigint "openingAdded",
      COUNT(*) FILTER (WHERE t."occurredAt">=${start ?? new Date(0)}) count, MAX(t."postedAt") "updatedAt"
    FROM "LedgerEntry" e JOIN "Transaction" t ON t.id=e."transactionId" LEFT JOIN "Transaction" r ON r.id=t."reversalOfId"
    WHERE e."fundId"=${fundId} AND e.account='CASH' AND t.status='POSTED' AND t."occurredAt"<=${cutoff}`);
  const monthly = await client.$queryRaw<
    { month: string; income: bigint; expense: bigint; net: bigint }[]
  >(Prisma.sql`
    SELECT to_char(t."occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh','YYYY-MM') AS "month",
      COALESCE(SUM(e.amount) FILTER (WHERE COALESCE(r.type,t.type)='INCOME'),0)::bigint income,
      COALESCE(-SUM(e.amount) FILTER (WHERE COALESCE(r.type,t.type)='EXPENSE'),0)::bigint expense, SUM(e.amount)::bigint net
    FROM "LedgerEntry" e JOIN "Transaction" t ON t.id=e."transactionId" LEFT JOIN "Transaction" r ON r.id=t."reversalOfId"
    WHERE e."fundId"=${fundId} AND e.account='CASH' AND t.status='POSTED' AND t."occurredAt">=${start ?? new Date(0)} AND t."occurredAt"<=${cutoff}
    GROUP BY "month" ORDER BY "month" DESC LIMIT 60`);
  const categories = await client.$queryRaw<{ name: string; amount: bigint }[]>(Prisma.sql`
    SELECT COALESCE(c.name,'Khác') name,-SUM(e.amount)::bigint amount
    FROM "LedgerEntry" e JOIN "Transaction" t ON t.id=e."transactionId" LEFT JOIN "Transaction" r ON r.id=t."reversalOfId" LEFT JOIN "Category" c ON c.id=COALESCE(r."categoryId",t."categoryId")
    WHERE e."fundId"=${fundId} AND e.account='CASH' AND t.status='POSTED' AND COALESCE(r.type,t.type)='EXPENSE' AND t."occurredAt">=${start ?? new Date(0)} AND t."occurredAt"<=${cutoff}
    GROUP BY c.name HAVING -SUM(e.amount)>0 ORDER BY amount DESC`);
  return {
    ...totals[0],
    count: Number(totals[0].count),
    monthly: monthly.reverse(),
    categories,
    asOf: cutoff,
  };
}
export async function transactionList(fundId: string, url: URL, isPublic = false) {
  const { page, pageSize } = pagination(url);
  const { start, end } = dates(url);
  const q = url.searchParams.get('q')?.slice(0, 200) || '';
  const type = url.searchParams.get('type');
  const categoryId = url.searchParams.get('categoryId');
  const status = url.searchParams.get('status');
  const where: Prisma.TransactionWhereInput = {
    OR: [{ fundId }, { targetFundId: fundId }],
    ...(isPublic
      ? {
          status: 'POSTED',
          isPublic: true,
          fund: {
            visibility: { in: ['PUBLIC', 'UNLISTED'] },
            active: true,
            group: { active: true },
          },
        }
      : status && ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'POSTED', 'REJECTED'].includes(status)
        ? { status: status as never }
        : {}),
    ...(type && ['INCOME', 'EXPENSE', 'TRANSFER', 'REVERSAL', 'OPENING'].includes(type)
      ? { type: type as never }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(start || end ? { occurredAt: { gte: start, lte: end } } : {}),
    ...(q
      ? { [isPublic ? 'publicDescription' : 'description']: { contains: q, mode: 'insensitive' } }
      : {}),
  };
  const [total, items] = await Promise.all([
    db.transaction.count({ where }),
    db.transaction.findMany({
      where,
      orderBy: [
        { occurredAt: url.searchParams.get('sort') === 'oldest' ? 'asc' : 'desc' },
        { id: 'desc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: true,
        entries: { where: { fundId, account: 'CASH' } },
        createdBy: { select: { name: true } },
        contributor: { select: { publicName: true, publicConsent: true } },
        reversedBy: { select: { id: true, status: true } },
        reconciliation: { select: { id: true } },
        attachments: {
          where: isPublic ? { isPublic: true, reviewed: true } : {},
          select: { id: true, originalName: true, mimeType: true, isPublic: true, reviewed: true },
        },
      },
    }),
  ]);
  return {
    page,
    pageSize,
    total,
    items: items.map((tx) =>
      isPublic
        ? {
            id: tx.id,
            code: tx.code,
            type: tx.type,
            description: tx.publicDescription,
            amount: tx.amount,
            cashAmount: tx.entries[0]?.amount ?? 0n,
            date: tx.occurredAt,
            category: tx.category?.name ?? 'Khác',
            verified: true,
            attachments: tx.attachments.map((a) => ({
              id: a.id,
              name: a.originalName,
              mimeType: a.mimeType,
            })),
          }
        : {
            ...tx,
            date: tx.occurredAt,
            cashAmount: tx.entries[0]?.amount,
            category: tx.category?.name ?? 'Khác',
          },
    ),
  };
}
export async function publicContributors(fundId: string) {
  const fund = await db.fund.findUniqueOrThrow({ where: { id: fundId } });
  if (!fund.showContributors) return [];
  return db.$queryRaw<{ name: string; amount: bigint; count: bigint }[]>(Prisma.sql`
    SELECT CASE WHEN m."publicConsent" THEN m."publicName" ELSE 'Người đóng góp ẩn danh' END name,
      SUM(t.amount)::bigint amount,COUNT(*) count
    FROM "Transaction" t LEFT JOIN "GroupMember" m ON m.id=t."contributorId"
    WHERE t."fundId"=${fundId} AND t.status='POSTED' AND t.type='INCOME' AND t."isPublic"=true
      AND NOT EXISTS(SELECT 1 FROM "Transaction" r WHERE r."reversalOfId"=t.id AND r.status='POSTED')
    GROUP BY CASE WHEN m."publicConsent" THEN m.id ELSE NULL END,CASE WHEN m."publicConsent" THEN m."publicName" ELSE 'Người đóng góp ẩn danh' END
    ORDER BY amount DESC LIMIT 100`);
}
export async function memberDues(userId: string, fundId: string) {
  const { member } = await fundAccess(userId, fundId);
  const isManager = member.roles.some((r) =>
    ['OWNER', 'MANAGER', 'TREASURER', 'APPROVER'].includes(r),
  );
  const periods = await db.fundPeriod.findMany({
    where: { fundId },
    orderBy: { dueAt: 'desc' },
    take: 100,
    include: {
      dues: {
        where: isManager ? {} : { memberId: member.id },
        include: {
          member: { include: { user: { select: { name: true } } } },
          adjustments: true,
          allocations: {
            include: {
              transaction: { select: { status: true, reversedBy: { select: { status: true } } } },
            },
          },
        },
      },
    },
  });
  return periods.map((p) => ({
    ...p,
    dues: p.dues.map((d) => ({
      ...d,
      name: d.member.user.name,
      summary: dueSummary(
        d.amount,
        d.adjustments.map((a) => a.amount),
        d.allocations
          .filter(
            (a) =>
              a.transaction.status === 'POSTED' && a.transaction.reversedBy?.status !== 'POSTED',
          )
          .map((a) => a.amount),
      ),
    })),
  }));
}
export async function dashboardData(userId: string, groupId?: string, fundId?: string) {
  const memberships = await db.groupMember.findMany({
    where: { userId, active: true, group: { active: true } },
    include: { group: true },
  });
  const groups = memberships.map((m) => ({ ...m.group, roles: m.roles }));
  const activeGroup = groupId ?? groups[0]?.id;
  if (!activeGroup)
    return {
      groups: [],
      funds: [],
      selectedFund: null,
      stats: null,
      recent: { items: [], total: 0 },
      pending: 0,
      unmatched: 0,
      periods: [],
    };
  await membership(userId, activeGroup);
  const funds = await db.fund.findMany({
    where: { groupId: activeGroup },
    orderBy: { createdAt: 'asc' },
  });
  const selectedFund = funds.find((f) => f.id === fundId) ?? funds[0] ?? null;
  const balances = await db.ledgerEntry.groupBy({
    by: ['fundId'],
    where: {
      fundId: { in: funds.map((f) => f.id) },
      account: 'CASH',
      transaction: { status: 'POSTED' },
    },
    _sum: { amount: true },
  });
  const balanceMap = new Map(balances.map((row) => [row.fundId, row._sum.amount ?? 0n]));
  const enriched = funds.map((f) => ({ ...f, balance: balanceMap.get(f.id) ?? 0n }));
  if (!selectedFund)
    return {
      groups,
      funds: enriched,
      selectedFund: null,
      stats: null,
      recent: { items: [], total: 0 },
      pending: 0,
      unmatched: 0,
      periods: [],
    };
  const [stats, recent, pending, unmatched, periods] = await Promise.all([
    statistics(selectedFund.id),
    transactionList(selectedFund.id, new URL('http://local/?pageSize=6')),
    db.transaction.count({ where: { fundId: selectedFund.id, status: 'PENDING_APPROVAL' } }),
    db.bankTransaction.count({ where: { fundId: selectedFund.id, reconciliation: null } }),
    memberDues(userId, selectedFund.id),
  ]);
  return { groups, funds: enriched, selectedFund, stats, recent, pending, unmatched, periods };
}
export async function publicDetail(slug: string) {
  const fund = await visibleFund(slug);
  const [stats, recent, contributors, activities, documents] = await Promise.all([
    fund.showSummary ? statistics(fund.id) : null,
    transactionList(fund.id, new URL('http://local/?pageSize=6'), true),
    publicContributors(fund.id),
    db.announcement.findMany({
      where: { fundId: fund.id, isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, title: true, content: true, createdAt: true },
    }),
    db.attachment.findMany({
      where: {
        fundId: fund.id,
        isPublic: true,
        reviewed: true,
        OR: [{ transactionId: null }, { transaction: { status: 'POSTED', isPublic: true } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, originalName: true, mimeType: true, size: true, createdAt: true },
    }),
  ]);
  return { fund: publicFundDTO(fund), stats, recent, contributors, activities, documents };
}
export async function publicTransaction(slug: string, id: string) {
  const fund = await visibleFund(slug);
  const tx = await db.transaction.findFirst({
    where: {
      id,
      status: 'POSTED',
      isPublic: true,
      OR: [{ fundId: fund.id }, { targetFundId: fund.id }],
      fund: { visibility: { in: ['PUBLIC', 'UNLISTED'] }, active: true, group: { active: true } },
    },
    include: {
      category: { select: { name: true } },
      entries: { where: { fundId: fund.id, account: 'CASH' }, select: { amount: true } },
      attachments: {
        where: { isPublic: true, reviewed: true },
        select: { id: true, originalName: true, mimeType: true },
      },
    },
  });
  ensure(tx, 'NOT_FOUND', 'Không tìm thấy giao dịch công khai.', 404);
  return {
    id: tx.id,
    code: tx.code,
    type: tx.type,
    amount: tx.amount,
    cashAmount: tx.entries[0]?.amount,
    date: tx.occurredAt,
    description: tx.publicDescription,
    category: tx.category?.name ?? 'Khác',
    fundName: fund.name,
    verified: true,
    attachments: tx.attachments.map((a) => ({
      id: a.id,
      name: a.originalName,
      mimeType: a.mimeType,
    })),
  };
}
