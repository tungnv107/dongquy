import { isIP } from 'node:net';

// Only enable behind a proxy which overwrites X-Forwarded-For or appends
// the actual peer address. The app port must not be publicly reachable.
export function requestIp(request: Request, trustProxy = process.env.TRUST_PROXY === 'true') {
  if (!trustProxy) return 'direct';
  const forwarded = request.headers.get('x-forwarded-for');
  const candidate = forwarded?.split(',').at(-1)?.trim();
  if (!candidate || !isIP(candidate)) return 'proxy';
  if (isIP(candidate) === 4) return candidate;
  const canonical = new URL(`http://[${candidate}]/`).hostname.slice(1, -1);
  // Equivalent IPv6 spellings must not create independent throttle buckets.
  return canonical;
}
