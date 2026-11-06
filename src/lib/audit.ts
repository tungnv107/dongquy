import { randomUUID } from 'node:crypto';
import { db } from './db';
import type { Database } from './policy';
import type { Prisma } from '@/generated/prisma/client';
export async function audit(
  client: Database,
  actorId: string | null,
  groupId: string | null,
  action: string,
  entityId: string,
  details: Prisma.InputJsonValue = {},
) {
  return client.auditLog.create({
    data: { actorId, groupId, action, entityId, details, correlationId: randomUUID() },
  });
}
export async function notifyGroup(
  client: Database,
  groupId: string,
  title: string,
  body: string,
  href = '/dashboard/transactions',
) {
  const members = await client.groupMember.findMany({
    where: { groupId, active: true },
    select: { userId: true },
  });
  await client.notification.createMany({
    data: members.map((m) => ({ userId: m.userId, title, body, href })),
  });
}
export async function serial<T>(fn: (client: Database) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.$transaction(fn, { isolationLevel: 'Serializable', timeout: 20000 });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (attempt < 3 && (code === 'P2034' || code === '40001')) {
        await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Transaction retry exhausted');
}
