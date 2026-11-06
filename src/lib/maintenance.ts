import { db } from './db';
import { dueSummary } from './money';
import { hash } from './auth';
import { serial } from './audit';
/** Safe to run repeatedly: one reminder per member/period/date, no change to money. */
export async function runMaintenance(now = new Date()) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  const periods = await db.fundPeriod.findMany({
    where: {
      closed: false,
      dueAt: {
        gte: new Date(now.getTime() - 7 * 86400000),
        lte: new Date(now.getTime() + 3 * 86400000),
      },
      fund: { active: true, group: { active: true } },
    },
    take: 1000,
    include: {
      fund: { select: { name: true } },
      dues: {
        include: {
          member: true,
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
  let reminders = 0;
  for (const period of periods)
    for (const due of period.dues) {
      if (!due.member.active) continue;
      const summary = dueSummary(
        due.amount,
        due.adjustments.map((a) => a.amount),
        due.allocations
          .filter(
            (a) =>
              a.transaction.status === 'POSTED' && a.transaction.reversedBy?.status !== 'POSTED',
          )
          .map((a) => a.amount),
      );
      if (summary.remaining <= 0n) continue;
      const id = 'reminder-' + hash(`${due.id}:${day}`).slice(0, 32);
      const result = await db.notification.createMany({
        data: [
          {
            id,
            userId: due.member.userId,
            title: period.dueAt < now ? 'Nhắc kỳ đóng quỹ quá hạn' : 'Sắp đến hạn đóng quỹ',
            body: `${period.fund.name} · ${period.name}. Vui lòng kiểm tra nghĩa vụ trong tài khoản của bạn.`,
            href: '/dashboard/contributions',
          },
        ],
        skipDuplicates: true,
      });
      reminders += result.count;
    }
  const removed = await serial(async (client) => {
    const sessions = await client.session.deleteMany({ where: { expiresAt: { lt: now } } });
    const oauth = await client.oAuthAttempt.deleteMany({ where: { expiresAt: { lt: now } } });
    const limits = await client.rateLimit.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - 86400000) } },
    });
    return { sessions: sessions.count, oauth: oauth.count, limits: limits.count };
  });
  return { reminders, removed };
}
