import { test, expect } from '@playwright/test';

test('login throttling cannot be bypassed by changing a forwarded IP header', async ({
  request,
}) => {
  const origin = process.env.E2E_BASE_URL || 'http://localhost:3140';
  const email = `security-${Date.now()}@example.test`;
  for (let attempt = 0; attempt < 13; attempt++) {
    const response = await request.post('/api/auth/login', {
      headers: { Origin: origin, 'X-Forwarded-For': `192.0.2.${attempt + 1}, 203.0.113.50` },
      data: { email, password: 'incorrect-password' },
    });
    expect(response.status()).toBe(attempt < 12 ? 401 : 429);
  }
});
