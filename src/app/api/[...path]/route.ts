import { cookies } from 'next/headers';
import { z, ZodError } from 'zod';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { AppError, ensure } from '@/lib/errors';
import {
  requireUser,
  currentUser,
  checkOrigin,
  rateLimit,
  hashPassword,
  verifyPassword,
  hash,
  createSession,
  sessionCookie,
} from '@/lib/auth';
import { googleStart, googleCallback } from '@/lib/oauth';
import { fundAccess, membership, writers, managers, visibleFund } from '@/lib/policy';
import {
  createGroup,
  saveFund,
  addMember,
  updateMember,
  inviteMember,
  acceptInvitation,
  createPeriod,
  setPeriodClosed,
  adjustDue,
} from '@/lib/groups';
import {
  createTransaction,
  transition,
  reverseTransaction,
  updateDraft,
  allocateContribution,
} from '@/lib/finance';
import {
  transactionList,
  statistics,
  publicContributors,
  publicDetail,
  publicTransaction,
  dashboardData,
  memberDues,
} from '@/lib/queries';
import { audit, serial } from '@/lib/audit';
import { groupInput, text, money, dates, pagination } from '@/lib/validation';
import {
  previewStatement,
  importStatement,
  reconciliationList,
  reconcile,
  receiveWebhook,
} from '@/lib/banking';
import { uploadAttachment, publishAttachment, downloadAttachment } from '@/lib/files';
import { exportReport } from '@/lib/reports';
import { requestIp } from '@/lib/request-ip';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function json(data: unknown, status = 200, extra?: HeadersInit) {
  return new Response(
    JSON.stringify({ data }, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...extra,
      },
    },
  );
}
async function boundedBody(req: Request, limit = 1024 * 1024) {
  ensure(
    Number(req.headers.get('content-length') || 0) <= limit,
    'FILE_TOO_LARGE',
    'Nội dung vượt giới hạn.',
    413,
  );
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new AppError('FILE_TOO_LARGE', 'Nội dung vượt giới hạn.', 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
async function body(req: Request) {
  ensure(
    req.headers.get('content-type')?.includes('application/json'),
    'VALIDATION_ERROR',
    'Yêu cầu JSON.',
  );
  return JSON.parse((await boundedBody(req)).toString('utf8'));
}
async function form(req: Request) {
  const raw = await boundedBody(req, 11 * 1024 * 1024);
  return new Request(req.url, {
    method: 'POST',
    headers: { 'Content-Type': req.headers.get('content-type') || '' },
    body: raw,
  }).formData();
}
async function handler(req: Request) {
  const url = new URL(req.url);
  const p = url.pathname.slice(5).split('/').filter(Boolean);
  const method = req.method;
  const mutation = !['GET', 'HEAD'].includes(method);
  const ip = requestIp(req);
  if (p[0] === 'health') {
    await db.$queryRaw`SELECT 1`;
    return json({ status: 'ok', service: 'dong-quy' });
  }
  if (p[0] === 'webhooks' && p[1] === 'bank' && method === 'POST') {
    await rateLimit('webhook:' + hash(ip), 120);
    return json(
      await receiveWebhook(
        (await boundedBody(req)).toString('utf8'),
        req.headers.get('x-webhook-timestamp'),
        req.headers.get('x-webhook-signature'),
      ),
    );
  }
  if (mutation) checkOrigin(req);
  await rateLimit('request:' + hash(ip), 1000);
  if (p[0] === 'auth') {
    if (p[1] === 'google' && method === 'GET')
      return p[2] === 'callback'
        ? googleCallback(url, (await cookies()).get('dq_oauth')?.value)
        : googleStart();
    if (p[1] === 'register' && method === 'POST') {
      await rateLimit('register:' + hash(ip), 10, 3600000);
      const data = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: z.email().toLowerCase(),
          password: z.string().min(12).max(128),
        })
        .parse(await body(req));
      const passwordHash = await hashPassword(data.password);
      const user = await db.user.create({
        data: { name: data.name, email: data.email, passwordHash },
      });
      const session = await createSession(user.id);
      await audit(db, user.id, null, 'ACCOUNT_CREATED', user.id);
      return json({ id: user.id, name: user.name }, 201, {
        'Set-Cookie': sessionCookie(session.token, session.expiresAt),
      });
    }
    if (p[1] === 'login' && method === 'POST') {
      const data = z
        .object({ email: z.email().toLowerCase(), password: z.string().min(1).max(128) })
        .parse(await body(req));
      await rateLimit('login-ip:' + hash(ip), 60, 900000);
      await rateLimit('login-account:' + hash(data.email), 30, 900000);
      await rateLimit('login:' + hash(ip + ':' + data.email), 12, 900000);
      const user = await db.user.findUnique({ where: { email: data.email } });
      const valid = await verifyPassword(
        data.password,
        user?.passwordHash || '00000000000000000000000000000000:' + '00'.repeat(64),
      );
      ensure(
        user && !user.disabled && valid,
        'UNAUTHENTICATED',
        'Email hoặc mật khẩu không đúng.',
        401,
      );
      const session = await createSession(user.id);
      await audit(db, user.id, null, 'LOGIN', user.id);
      return json({ id: user.id, name: user.name }, 200, {
        'Set-Cookie': sessionCookie(session.token, session.expiresAt),
      });
    }
    if (p[1] === 'logout' && method === 'POST') {
      const token = (await cookies()).get('dq_session')?.value;
      if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
      return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', new Date(0)) });
    }
    if (p[1] === 'me') return json(await currentUser());
    if (p[1] === 'profile' && method === 'PATCH') {
      const user = await requireUser();
      const data = z.object({ name: z.string().trim().min(2).max(100) }).parse(await body(req));
      await db.user.update({ where: { id: user.id }, data });
      return json({ ok: true });
    }
  }
  if (p[0] === 'public' && p[1] === 'funds') {
    if (!p[2] && method === 'GET') {
      const { page, pageSize } = pagination(url);
      const q = url.searchParams.get('q')?.slice(0, 100) || '';
      const where = {
        visibility: 'PUBLIC' as const,
        active: true,
        group: { active: true },
        name: { contains: q, mode: 'insensitive' as const },
      };
      const [total, funds] = await Promise.all([
        db.fund.count({ where }),
        db.fund.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            type: true,
            goalAmount: true,
            showSummary: true,
            group: { select: { name: true, isDemo: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return json({
        items: await Promise.all(
          funds.map(async (f) => ({ ...f, stats: f.showSummary ? await statistics(f.id) : null })),
        ),
        total,
        page,
        pageSize,
      });
    }
    const slug = p[2];
    if (!p[3] && method === 'GET') return json(await publicDetail(slug));
    const fund = await visibleFund(slug);
    if (p[3] === 'statistics' && method === 'GET') {
      ensure(fund.showSummary, 'FORBIDDEN', 'Quỹ chưa cho phép công khai số liệu tổng hợp.', 403);
      const { start, end } = dates(url);
      return json(await statistics(fund.id, start, end));
    }
    if (p[3] === 'transactions' && method === 'GET')
      return json(
        p[4] ? await publicTransaction(slug, p[4]) : await transactionList(fund.id, url, true),
      );
    if (p[3] === 'contributors' && method === 'GET') return json(await publicContributors(fund.id));
    if (p[3] === 'activities' && method === 'GET')
      return json(
        await db.announcement.findMany({
          where: { fundId: fund.id, isPublic: true },
          take: 50,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, content: true, createdAt: true },
        }),
      );
    if (p[3] === 'reports' && method === 'GET') {
      const report = await exportReport(url, { slug });
      return report instanceof Response ? report : json(report);
    }
    if (p[3] === 'contribute' && method === 'POST') {
      await rateLimit('contribute:' + hash(ip), 10, 3600000);
      ensure(
        fund.bankPublicConsent && fund.bankAccount,
        'NOT_CONFIGURED',
        'Quỹ chưa công khai tài khoản nhận đóng góp.',
        503,
      );
      const data = z
        .object({ amount: money, publicName: z.string().trim().max(100).default('Ẩn danh') })
        .parse(await body(req));
      const reference = 'DQ ' + randomUUID().slice(0, 8).toUpperCase();
      const request = await db.contributionRequest.create({
        data: { ...data, reference, fundId: fund.id },
      });
      return json({ id: request.id, reference, status: 'PENDING', amount: request.amount }, 201);
    }
  }
  if (p[0] === 'attachments' && p[1] && method === 'GET')
    return downloadAttachment(p[1], (await currentUser())?.id);
  const user = await requireUser();
  if (mutation) await rateLimit('mutation:' + user.id, 100);
  if (p[0] === 'dashboard' && method === 'GET')
    return json(
      await dashboardData(
        user.id,
        url.searchParams.get('groupId') || undefined,
        url.searchParams.get('fundId') || undefined,
      ),
    );
  if (p[0] === 'groups') {
    if (!p[1]) {
      if (method === 'POST') return json(await createGroup(user.id, await body(req)), 201);
      if (method === 'GET')
        return json(
          await db.groupMember.findMany({
            where: { userId: user.id, active: true, group: { active: true } },
            include: { group: true },
          }),
        );
    }
    const groupId = p[1];
    if (p[2] === 'members') {
      if (!p[3] && method === 'GET') {
        const actor = await membership(user.id, groupId);
        const privileged = actor.roles.some((r) =>
          ['OWNER', 'MANAGER', 'TREASURER', 'APPROVER'].includes(r),
        );
        const members = await db.groupMember.findMany({
          where: { groupId, ...(!privileged ? { userId: user.id } : {}) },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { joinedAt: 'asc' },
          take: 1000,
        });
        return json(members);
      }
      if (!p[3] && method === 'POST')
        return json(await addMember(user.id, groupId, await body(req)), 201);
      if (p[3] && method === 'PATCH')
        return json(await updateMember(user.id, groupId, p[3], await body(req)));
    }
    if (p[2] === 'invitations' && method === 'POST')
      return json(await inviteMember(user.id, groupId, await body(req)), 201);
    if (!p[2] && method === 'PATCH') {
      const input = await body(req);
      const data = groupInput.partial().parse(input);
      for (const key of Object.keys(data) as (keyof typeof data)[])
        if (!Object.prototype.hasOwnProperty.call(input, key)) delete data[key];
      return json(
        await serial(async (c) => {
          await membership(user.id, groupId, ['OWNER'], c);
          const group = await c.group.update({ where: { id: groupId }, data });
          await audit(c, user.id, groupId, 'GROUP_UPDATED', groupId, { fields: Object.keys(data) });
          return group;
        }),
      );
    }
  }
  if (p[0] === 'invitations' && p[1] === 'accept' && method === 'POST') {
    const data = z.object({ token: text }).parse(await body(req));
    return json(await acceptInvitation(user.id, data.token));
  }
  if (p[0] === 'funds') {
    if (!p[1] && method === 'POST') return json(await saveFund(user.id, await body(req)), 201);
    if (!p[1] && method === 'GET')
      return json(
        await db.fund.findMany({
          where: { group: { active: true, members: { some: { userId: user.id, active: true } } } },
          take: 100,
        }),
      );
    if (p[1] && !p[2]) {
      if (method === 'GET') {
        await fundAccess(user.id, p[1]);
        return json(
          await db.fund.findUnique({ where: { id: p[1] }, include: { categories: true } }),
        );
      }
      if (method === 'PATCH') return json(await saveFund(user.id, await body(req), p[1]));
    }
    if (p[2] === 'categories') {
      const { fund } = await fundAccess(user.id, p[1], method === 'POST' ? managers : undefined);
      if (method === 'GET') return json(await db.category.findMany({ where: { fundId: fund.id } }));
      if (method === 'POST') {
        const data = z
          .object({ name: text, type: z.enum(['INCOME', 'EXPENSE']) })
          .parse(await body(req));
        return json(
          await serial(async (c) => {
            const category = await c.category.create({ data: { ...data, fundId: fund.id } });
            await audit(c, user.id, fund.groupId, 'CATEGORY_CREATED', category.id);
            return category;
          }),
          201,
        );
      }
    }
  }
  if (p[0] === 'transactions') {
    if (!p[1] && method === 'POST')
      return json(
        await createTransaction(user.id, await body(req), req.headers.get('idempotency-key') || ''),
        201,
      );
    if (!p[1] && method === 'GET') {
      const fundId = url.searchParams.get('fundId') || '';
      await fundAccess(user.id, fundId);
      return json(await transactionList(fundId, url));
    }
    if (p[1] && !p[2]) {
      const tx = await db.transaction.findUnique({
        where: { id: p[1] },
        include: {
          approvals: { include: { user: { select: { name: true } } } },
          attachments: { select: { id: true, originalName: true, isPublic: true, reviewed: true } },
          entries: true,
          allocations: true,
        },
      });
      ensure(tx, 'NOT_FOUND', 'Không tìm thấy giao dịch.', 404);
      await fundAccess(user.id, tx.fundId);
      if (method === 'GET') return json(tx);
      if (method === 'PATCH') return json(await updateDraft(user.id, p[1], await body(req)));
    }
    if (p[1] && p[2] && method === 'POST') {
      const data = z.object({ reason: z.string().max(1000).default('') }).parse(await body(req));
      return json(
        p[2] === 'reverse'
          ? await reverseTransaction(
              user.id,
              p[1],
              data.reason,
              req.headers.get('idempotency-key') || '',
            )
          : await transition(user.id, p[1], p[2], data.reason),
      );
    }
  }
  if (p[0] === 'periods') {
    if (p[1] && !p[2] && method === 'PATCH')
      return json(await setPeriodClosed(user.id, p[1], await body(req)));
    if (!p[1] && method === 'POST') return json(await createPeriod(user.id, await body(req)), 201);
    if (!p[1] && method === 'GET')
      return json(await memberDues(user.id, url.searchParams.get('fundId') || ''));
    if (p[1] && p[2] === 'adjustments' && method === 'POST')
      return json(await adjustDue(user.id, p[1], await body(req)));
  }
  if (p[0] === 'contributions' && method === 'POST')
    return json(await allocateContribution(user.id, await body(req)), 201);
  if (p[0] === 'contribution-requests') {
    if (method === 'GET') {
      const fundId = url.searchParams.get('fundId') || '';
      await fundAccess(user.id, fundId, writers);
      return json(
        await db.contributionRequest.findMany({
          where: { fundId },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      );
    }
    if (p[1] && p[2] === 'confirm' && method === 'POST') {
      const data = z.object({ transactionId: text }).parse(await body(req));
      return json(
        await serial(async (c) => {
          const request = await c.contributionRequest.findUnique({ where: { id: p[1] } });
          ensure(request?.status === 'PENDING', 'CONFLICT', 'Yêu cầu không ở trạng thái chờ.', 409);
          const { fund } = await fundAccess(user.id, request.fundId, writers, c);
          const tx = await c.transaction.findUnique({
            where: { id: data.transactionId },
            include: { reconciliation: { include: { bankTransaction: true } }, reversedBy: true },
          });
          ensure(
            tx &&
              tx.fundId === fund.id &&
              tx.type === 'INCOME' &&
              tx.status === 'POSTED' &&
              tx.amount === request.amount &&
              tx.reconciliation &&
              !tx.reversedBy,
            'VALIDATION_ERROR',
            'Cần khoản thu cùng quỹ, đúng số tiền, đã ghi sổ và đối soát.',
          );
          ensure(
            tx.reconciliation.bankTransaction.description.includes(request.reference) ||
              tx.bankReference === request.reference,
            'VALIDATION_ERROR',
            'Mã tham chiếu đóng góp chưa khớp với bằng chứng ngân hàng.',
          );
          const result = await c.contributionRequest.update({
            where: { id: request.id },
            data: { status: 'CONFIRMED', confirmedTransactionId: tx.id },
          });
          await audit(c, user.id, fund.groupId, 'CONTRIBUTION_CONFIRMED', request.id, {
            transactionId: tx.id,
          });
          return result;
        }),
      );
    }
  }
  if (p[0] === 'statements' && method === 'POST') {
    if (p[1] === 'preview') {
      const fd = await form(req);
      await fundAccess(user.id, String(fd.get('fundId')), writers);
      const file = fd.get('file');
      ensure(file instanceof File, 'VALIDATION_ERROR', 'Chọn tệp sao kê.');
      return json(await previewStatement(file));
    }
    if (p[1] === 'import') return json(await importStatement(user.id, await body(req)));
  }
  if (p[0] === 'reconciliations') {
    if (method === 'GET')
      return json(await reconciliationList(user.id, url.searchParams.get('fundId') || ''));
    if (method === 'POST') return json(await reconcile(user.id, await body(req)));
  }
  if (p[0] === 'reports' && method === 'GET') {
    const report = await exportReport(url, {
      userId: user.id,
      fundId: url.searchParams.get('fundId') || '',
    });
    return report instanceof Response ? report : json(report);
  }
  if (p[0] === 'attachments') {
    if (method === 'POST') return json(await uploadAttachment(user.id, await form(req)), 201);
    if (p[1] && method === 'PATCH') {
      const data = z
        .object({ isPublic: z.boolean(), reviewed: z.boolean() })
        .parse(await body(req));
      return json(await publishAttachment(user.id, p[1], data.isPublic, data.reviewed));
    }
    if (method === 'GET') {
      const fundId = url.searchParams.get('fundId') || '';
      await fundAccess(user.id, fundId);
      return json(
        await db.attachment.findMany({
          where: { fundId },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true,
            isPublic: true,
            reviewed: true,
            transactionId: true,
            createdAt: true,
          },
        }),
      );
    }
  }
  if (p[0] === 'announcements') {
    if (method === 'GET') {
      const fundId = url.searchParams.get('fundId') || '';
      await fundAccess(user.id, fundId);
      return json(
        await db.announcement.findMany({
          where: { fundId },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      );
    }
    if (method === 'POST') {
      const data = z
        .object({
          fundId: text,
          title: text,
          content: z.string().min(1).max(10000),
          isPublic: z.boolean().default(false),
        })
        .parse(await body(req));
      return json(
        await serial(async (c) => {
          const { fund } = await fundAccess(user.id, data.fundId, managers, c);
          const post = await c.announcement.create({ data: { ...data, actorId: user.id } });
          await audit(c, user.id, fund.groupId, 'ANNOUNCEMENT_CREATED', post.id);
          return post;
        }),
        201,
      );
    }
  }
  if (p[0] === 'notifications') {
    if (method === 'GET')
      return json(
        await db.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      );
    if (method === 'POST' && p[1] === 'read') {
      await db.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
      });
      return json({ ok: true });
    }
  }
  if (p[0] === 'audit-logs' && method === 'GET') {
    const groupId = url.searchParams.get('groupId') || '';
    await membership(user.id, groupId, ['OWNER', 'MANAGER', 'APPROVER']);
    const { page, pageSize } = pagination(url);
    const [total, items] = await Promise.all([
      db.auditLog.count({ where: { groupId } }),
      db.auditLog.findMany({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return json({ items, total, page, pageSize });
  }
  if (p[0] === 'admin') {
    ensure(user.platformAdmin, 'FORBIDDEN', 'Chỉ quản trị viên nền tảng được truy cập.', 403);
    if (!p[1] && method === 'GET') {
      const { page, pageSize } = pagination(url);
      return json({
        users: await db.user.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: {
            id: true,
            name: true,
            email: true,
            disabled: true,
            platformAdmin: true,
            createdAt: true,
          },
        }),
        groups: await db.group.count(),
        funds: await db.fund.count(),
        usersTotal: await db.user.count(),
        groupDirectory: await db.group.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: { id: true, name: true, active: true },
        }),
        fundDirectory: await db.fund.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: { id: true, name: true, active: true },
        }),
        securityLogs: await db.auditLog.findMany({
          where: { groupId: null },
          take: 30,
          orderBy: { createdAt: 'desc' },
        }),
        integrations: {
          google: Boolean(process.env.GOOGLE_CLIENT_ID),
          bank: Boolean(process.env.BANK_WEBHOOK_SECRET),
        },
        page,
        pageSize,
      });
    }
    if ((p[1] === 'groups' || p[1] === 'funds') && p[2] && method === 'PATCH') {
      const data = z.object({ active: z.boolean() }).parse(await body(req));
      return json(
        await serial(async (client) => {
          const resource =
            p[1] === 'groups'
              ? await client.group.update({ where: { id: p[2] }, data })
              : await client.fund.update({ where: { id: p[2] }, data });
          await audit(client, user.id, null, 'PLATFORM_RESOURCE_STATUS_CHANGED', resource.id, {
            resource: p[1],
            active: data.active,
          });
          return { id: resource.id, active: resource.active };
        }),
      );
    }
    if (p[1] === 'users' && p[2] && method === 'PATCH') {
      const data = z.object({ disabled: z.boolean() }).parse(await body(req));
      ensure(p[2] !== user.id, 'VALIDATION_ERROR', 'Không thể tự vô hiệu hóa tài khoản quản trị.');
      return json(
        await serial(async (c) => {
          const target = await c.user.findUnique({ where: { id: p[2] } });
          ensure(
            target && !target.platformAdmin,
            'FORBIDDEN',
            'Không thay đổi tài khoản quản trị khác qua giao diện này.',
            403,
          );
          await c.user.update({ where: { id: p[2] }, data });
          if (data.disabled) await c.session.deleteMany({ where: { userId: p[2] } });
          await audit(c, user.id, null, 'USER_STATUS_CHANGED', p[2], data);
          return { ok: true };
        }),
      );
    }
  }
  throw new AppError('NOT_FOUND', 'API không tồn tại.', 404);
}
async function route(req: Request) {
  try {
    return await handler(req);
  } catch (error) {
    let status = 500,
      code = 'INTERNAL_ERROR',
      message = 'Đã có lỗi hệ thống. Vui lòng thử lại.';
    if (error instanceof AppError) {
      ({ status, code, message } = error);
    } else if (error instanceof ZodError) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    } else if (error instanceof SyntaxError) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = 'Nội dung JSON không hợp lệ.';
    } else if ((error as { code?: string }).code === 'P2002') {
      status = 409;
      code = 'CONFLICT';
      message = 'Dữ liệu hoặc mã yêu cầu đã tồn tại. Vui lòng tải lại và kiểm tra.';
    } else if ((error as { code?: string }).code === 'P2003') {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = 'Dữ liệu tham chiếu không hợp lệ.';
    }
    if (status === 500)
      console.error('API_ERROR', {
        correlationId: randomUUID(),
        code: (error as { code?: string }).code || 'UNKNOWN',
      });
    return new Response(JSON.stringify({ error: { code, message } }), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
export { route as GET, route as POST, route as PATCH };
