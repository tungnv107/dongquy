import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
});
const base = 'http://localhost:3139';
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await fs.mkdir('data/qa', { recursive: true });
await page.goto(base, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'data/qa/home-desktop.png', fullPage: true });
await page.goto(base + '/funds/quy-song-xanh', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'data/qa/public-desktop.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'data/qa/public-mobile.png', fullPage: true });
const publicOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
const accounts = JSON.parse(await fs.readFile('data/dev-accounts.json', 'utf8'));
await page.goto(base + '/login');
await page.getByLabel('Địa chỉ email').fill(accounts.owner);
await page.getByLabel('Mật khẩu', { exact: true }).fill(accounts.password);
await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
await page.waitForURL('**/dashboard');
await page.locator('.stat-balance').waitFor();
await page.waitForLoadState('networkidle');
await page.setViewportSize({ width: 1440, height: 1050 });
await page.screenshot({ path: 'data/qa/dashboard-desktop.png', fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'data/qa/dashboard-mobile.png', fullPage: true });
const dashboardOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
await page.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click();
await page.screenshot({ path: 'data/qa/dashboard-dark-mobile.png', fullPage: true });
console.log(JSON.stringify({ errors, publicOverflow, dashboardOverflow }, null, 2));
await browser.close();
if (errors.length || publicOverflow || dashboardOverflow) process.exitCode = 1;
