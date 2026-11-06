import { createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { db } from './db';
import { hash, randomToken, createSession, sessionCookie } from './auth';
import { ensure } from './errors';
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const oauthCookie = (state: string, age = 600) =>
  `dq_oauth=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${process.env.APP_URL?.startsWith('https://') ? '; Secure' : ''}`;
export async function googleStart() {
  ensure(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    'NOT_CONFIGURED',
    'Đăng nhập Google chưa được cấu hình. Bạn có thể đăng nhập bằng email.',
    503,
  );
  const state = randomToken(),
    verifier = randomToken(),
    nonce = randomToken();
  await db.oAuthAttempt.create({
    data: { id: hash(state), verifier, nonce, expiresAt: new Date(Date.now() + 600000) },
  });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString();
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString(), 'Set-Cookie': oauthCookie(state) },
  });
}
export async function googleCallback(url: URL, cookieState?: string) {
  const state = url.searchParams.get('state'),
    code = url.searchParams.get('code');
  ensure(
    state && code && state === cookieState,
    'FORBIDDEN',
    'Phiên đăng nhập Google không hợp lệ.',
    403,
  );
  const attempt = await db.oAuthAttempt.findUnique({ where: { id: hash(state) } });
  ensure(attempt && attempt.expiresAt > new Date(), 'FORBIDDEN', 'Phiên Google đã hết hạn.', 403);
  const consumed = await db.oAuthAttempt.deleteMany({ where: { id: attempt.id } });
  ensure(consumed.count === 1, 'FORBIDDEN', 'Phiên đã được sử dụng.', 403);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      code_verifier: attempt.verifier,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  ensure(response.ok, 'FORBIDDEN', 'Google không xác nhận phiên đăng nhập.', 403);
  const tokens = await response.json();
  const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  ensure(
    payload.nonce === attempt.nonce &&
      payload.email_verified === true &&
      typeof payload.email === 'string' &&
      payload.sub,
    'FORBIDDEN',
    'Danh tính Google không hợp lệ.',
    403,
  );
  let user = await db.user.findUnique({ where: { googleId: payload.sub } });
  if (!user) {
    ensure(
      !(await db.user.findUnique({ where: { email: payload.email.toLowerCase() } })),
      'CONFLICT',
      'Email đã có tài khoản. Vui lòng đăng nhập bằng phương thức đã đăng ký.',
      409,
    );
    user = await db.user.create({
      data: {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        name: String(payload.name || payload.email).slice(0, 100),
      },
    });
  }
  ensure(!user.disabled, 'FORBIDDEN', 'Tài khoản bị vô hiệu hóa.', 403);
  const session = await createSession(user.id);
  const headers = new Headers({ Location: `${process.env.APP_URL}/dashboard` });
  headers.append('Set-Cookie', sessionCookie(session.token, session.expiresAt));
  headers.append('Set-Cookie', oauthCookie('', 0));
  return new Response(null, { status: 302, headers });
}
