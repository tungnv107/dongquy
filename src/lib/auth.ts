import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { db } from './db';
import { AppError, ensure } from './errors';
const scrypt = promisify(scryptCallback);
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + ((await scrypt(password, salt, 64)) as Buffer).toString('hex');
}
export async function verifyPassword(password: string, encoded: string) {
  const [salt, key] = encoded.split(':');
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(key, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { tokenHash: hash(token), userId, expiresAt } });
  return { token, expiresAt };
}
export const sessionCookie = (token: string, expiresAt: Date) =>
  `dq_session=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${process.env.APP_URL?.startsWith('https://') ? '; Secure' : ''}`;
export async function userFromToken(token?: string) {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date() || session.user.disabled) return null;
  const { id, name, email, platformAdmin } = session.user;
  return { id, name, email, platformAdmin };
}
export async function currentUser() {
  return userFromToken((await cookies()).get('dq_session')?.value);
}
export async function requireUser() {
  const user = await currentUser();
  ensure(user, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.', 401);
  return user;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = new URL(process.env.APP_URL || 'http://localhost:3000').origin;
  ensure(origin === expected, 'CSRF', 'Nguồn yêu cầu không hợp lệ.', 403);
}
export async function rateLimit(key: string, max = 50, windowMs = 60000) {
  const now = new Date();
  const expiry = new Date(Date.now() + windowMs);
  const rows = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RateLimit" ("key","count","expiresAt") VALUES (${key},1,${expiry}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."expiresAt"<${now} THEN 1 ELSE "RateLimit"."count"+1 END,"expiresAt"=CASE WHEN "RateLimit"."expiresAt"<${now} THEN ${expiry} ELSE "RateLimit"."expiresAt" END RETURNING "count"`;
  if (rows[0].count > max)
    throw new AppError('RATE_LIMITED', 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', 429);
}
