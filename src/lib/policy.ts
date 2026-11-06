import { db } from './db';
import { ensure } from './errors';
import type { Prisma, Role } from '@/generated/prisma/client';
export type Database = Prisma.TransactionClient;
export const writers: Role[] = ['OWNER', 'MANAGER', 'TREASURER'];
export const managers: Role[] = ['OWNER', 'MANAGER'];
export const approvers: Role[] = ['OWNER', 'APPROVER'];
export async function membership(
  userId: string,
  groupId: string,
  allowed?: Role[],
  client: Database = db,
) {
  const member = await client.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: true },
  });
  ensure(
    member?.active && member.group.active,
    'FORBIDDEN',
    'Bạn không có quyền truy cập nhóm này.',
    403,
  );
  if (allowed)
    ensure(
      member.roles.some((r) => allowed.includes(r)),
      'FORBIDDEN',
      'Vai trò của bạn không được phép thực hiện thao tác này.',
      403,
    );
  return member;
}
export async function fundAccess(
  userId: string,
  fundId: string,
  allowed?: Role[],
  client: Database = db,
) {
  const fund = await client.fund.findUnique({ where: { id: fundId } });
  ensure(fund, 'NOT_FOUND', 'Không tìm thấy quỹ.', 404);
  const member = await membership(userId, fund.groupId, allowed, client);
  return { fund, member };
}
export async function visibleFund(slug: string) {
  const fund = await db.fund.findFirst({
    where: {
      slug,
      visibility: { in: ['PUBLIC', 'UNLISTED'] },
      active: true,
      group: { active: true },
    },
    include: {
      group: { select: { name: true, isDemo: true, logoUrl: true, coverUrl: true } },
      categories: true,
    },
  });
  ensure(fund, 'NOT_FOUND', 'Không tìm thấy quỹ công khai.', 404);
  return fund;
}
