import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const checks = [];
const previewStyles =
  process.env.QA_CSS_PREVIEW === '1' ? await fs.readFile('src/app/globals.css', 'utf8') : null;
const evidencePath = previewStyles
  ? 'data/qa/accessibility-preview.json'
  : 'data/qa/accessibility.json';
for (const route of ['/', '/login', '/funds/quy-song-xanh']) {
  await page.goto('http://localhost:3139' + route);
  await page.waitForLoadState('networkidle');
  if (previewStyles) await page.addStyleTag({ content: previewStyles });
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  checks.push({
    route,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
}
const accounts = JSON.parse(await fs.readFile('data/dev-accounts.json', 'utf8'));
await page.goto('http://localhost:3139/login');
await page.getByLabel('Địa chỉ email').fill(accounts.owner);
await page.getByLabel('Mật khẩu', { exact: true }).fill(accounts.password);
await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
await page.waitForURL('**/dashboard');
await page.locator('.stat-balance').waitFor();
await page.waitForLoadState('networkidle');
if (previewStyles) await page.addStyleTag({ content: previewStyles });
const result = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
  .analyze();
checks.push({
  route: '/dashboard',
  violations: result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
  })),
});
await fs.writeFile(evidencePath, JSON.stringify(checks, null, 2));
for (const route of ['/', '/funds/quy-song-xanh', '/dashboard']) {
  await page.evaluate(() => localStorage.setItem('dq-theme', 'dark'));
  await page.goto('http://localhost:3139' + route);
  await page.waitForLoadState('networkidle');
  if (previewStyles) await page.addStyleTag({ content: previewStyles });
  const dark = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  checks.push({
    route: route + ' [dark]',
    violations: dark.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
}
await fs.writeFile(evidencePath, JSON.stringify(checks, null, 2));
console.log(
  JSON.stringify(
    checks.map((c) => ({
      route: c.route,
      violations: c.violations.map((v) => ({ id: v.id, nodes: v.nodes.length })),
    })),
    null,
    2,
  ),
);
await browser.close();
if (checks.some((c) => c.violations.length)) process.exitCode = 1;
