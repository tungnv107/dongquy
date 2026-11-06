import { test, expect, type Page } from '@playwright/test';
import ExcelJS from 'exceljs';
const origin = process.env.E2E_BASE_URL || 'http://localhost:3140';
async function register(page: Page, name: string, email: string, password: string) {
  await page.goto(origin + '/register');
  await page.getByLabel('Họ và tên').fill(name);
  await page.getByLabel('Địa chỉ email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Tạo tài khoản', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('acceptance: group → fund → receipt → two-person approval → posting → anonymous public transparency', async ({
  page,
  browser,
}) => {
  const suffix = Date.now();
  const password = 'E2e!StrongPassword2026';
  const ownerEmail = `e2e-${suffix}@example.test`,
    approverEmail = `e2e-approver-${suffix}@example.test`;
  const slug = `e2e-fund-${suffix}`;
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await register(page, 'Chủ quỹ E2E', ownerEmail, password);
  await page.getByRole('link', { name: 'Tạo nhóm của bạn' }).click();
  await page.getByRole('button', { name: 'Tạo nhóm', exact: true }).click();
  await page.getByLabel('Tên nhóm', { exact: false }).fill('Nhóm kiểm chứng E2E');
  await page.getByLabel('Đường dẫn nhóm').fill(`e2e-group-${suffix}`);
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link', { name: 'Quản lý quỹ', exact: true }).click();
  await page.getByRole('button', { name: 'Tạo quỹ', exact: true }).click();
  await page.getByLabel('Tên quỹ', { exact: false }).fill('Quỹ kiểm chứng minh bạch');
  await page.getByLabel('Đường dẫn công khai').fill(slug);
  await page.getByLabel('Quyền truy cập').selectOption('PUBLIC');
  await page.getByLabel('Giới thiệu quỹ').fill('Quỹ được tạo bởi kiểm thử trình duyệt thực tế.');
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const groups = (await (await page.request.get('/api/groups')).json()).data;
  const groupId = groups[0].groupId;
  const funds = (await (await page.request.get('/api/funds')).json()).data;
  const fundId = funds.find((f: { slug: string }) => f.slug === slug).id;
  const approverContext = await browser.newContext({ baseURL: origin });
  const approver = await approverContext.newPage();
  await register(approver, 'Người duyệt E2E', approverEmail, password);
  await page.getByRole('link', { name: 'Thành viên', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm thành viên', exact: true }).click();
  await page.getByLabel('Email thành viên').fill(approverEmail);
  await page.getByRole('checkbox', { name: 'Người duyệt', exact: true }).check();
  await page.getByRole('button', { name: 'Lưu thông tin' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Thêm giao dịch' }).click();
  await page.getByLabel('Số tiền (VND)', { exact: false }).fill('500000');
  await page.getByLabel('Nội dung nội bộ').fill('Đóng góp E2E · private@example.test');
  await page.getByLabel('Nội dung được phép công khai').fill('Đóng góp đã kiểm chứng E2E');
  await page.getByRole('checkbox', { name: 'Cho phép công khai giao dịch sau khi ghi sổ' }).check();
  await page.getByRole('button', { name: 'Lưu bản nháp' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('link', { name: 'Thu chi', exact: true }).click();
  await page.getByRole('button', { name: /Đóng góp E2E/ }).click();
  await page.getByRole('button', { name: 'Gửi phê duyệt', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Chờ phê duyệt', { exact: true })).toBeVisible();
  const pending = (await (await page.request.get(`/api/transactions?fundId=${fundId}`)).json()).data
    .items[0];
  const before = (await (await page.request.get(`/api/public/funds/${slug}/statistics`)).json())
    .data;
  expect(before.closing).toBe('0');
  await page.getByRole('dialog').getByRole('button', { name: 'Phê duyệt', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('người tạo và người duyệt khác nhau');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  await approver.goto('/dashboard/approvals');
  await approver.getByRole('button', { name: /Đóng góp E2E/ }).click();
  await approver.getByRole('button', { name: 'Phê duyệt', exact: true }).click();
  await approver.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(
    approver.getByRole('dialog').getByText('Đã phê duyệt', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Đóng góp E2E/ }).click();
  await page.getByRole('button', { name: 'Ghi sổ', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Đã ghi sổ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();
  const publicContext = await browser.newContext({ baseURL: origin });
  const publicPage = await publicContext.newPage();
  await publicPage.goto(`/funds/${slug}`);
  await expect(
    publicPage.getByRole('heading', { name: 'Quỹ kiểm chứng minh bạch', exact: true }),
  ).toBeVisible();
  await expect(publicPage.locator('.stat-balance')).toContainText('500.000');
  await expect(publicPage.getByText('Đóng góp đã kiểm chứng E2E', { exact: true })).toBeVisible();
  expect(await publicPage.content()).not.toContain('private@example.test');
  await expect(publicPage.getByRole('link', { name: 'Đăng nhập', exact: false })).toBeVisible();
  const forbidden = await publicPage.request.get('/api/funds');
  expect(forbidden.status()).toBe(401);
  const csrf = await page.request.post('/api/transactions', {
    data: { fundId },
    headers: { Origin: 'https://evil.invalid' },
  });
  expect(csrf.status()).toBe(403);
  await publicPage.getByRole('button', { name: 'Chia sẻ', exact: true }).click();
  await expect(publicPage.getByAltText('Mã QR dẫn đến trang quỹ')).toBeVisible();
  await publicPage.keyboard.press('Escape');
  await expect(publicPage.getByRole('dialog')).not.toBeVisible();
  await publicPage.goto(`/funds/${slug}/transactions`);
  await publicPage.getByRole('textbox', { name: 'Tìm kiếm giao dịch…' }).fill('không tồn tại');
  await expect(publicPage.getByText('Chưa có giao dịch phù hợp')).toBeVisible();
  await publicPage.getByRole('textbox', { name: 'Tìm kiếm giao dịch…' }).fill('');
  await expect(publicPage.getByText('Đóng góp đã kiểm chứng E2E', { exact: true })).toBeVisible();
  await publicPage.getByRole('button', { name: 'Chuyển sang giao diện tối' }).click();
  await expect(publicPage.locator('html')).toHaveAttribute('data-theme', 'dark');
  await publicPage.reload();
  await expect(publicPage.locator('html')).toHaveAttribute('data-theme', 'dark');
  await publicPage.getByRole('button', { name: 'Chuyển sang giao diện sáng' }).click();
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await publicPage.goto(`/funds/${slug}`);
  expect(
    await publicPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await publicPage.screenshot({ path: 'test-results/public-mobile.png', fullPage: true });
  await page.goto('/dashboard');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.stat-balance')).toContainText('500.000');
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  for (const path of [
    'groups',
    'funds',
    'members',
    'contributions',
    'expenses',
    'approvals',
    'reconciliation',
    'reports',
    'documents',
    'activities',
    'settings',
    'audit-logs',
  ]) {
    await page.goto(`/dashboard/${path}`);
    await expect(page.locator('#main')).toBeVisible();
    await expect(page.getByText('Đã có lỗi hệ thống. Vui lòng thử lại.')).not.toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Mở menu' }).click();
  await expect(page.getByRole('link', { name: 'Thu chi', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Thu chi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mở menu' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
  expect(pending.id).toBeTruthy();
  expect(groupId).toBeTruthy();
  for (const view of ['contributors', 'reports', 'activities', 'documents', 'contribute']) {
    await publicPage.goto(`/funds/${slug}/${view}`);
    await expect(publicPage.locator('#main')).toBeVisible();
    await expect(publicPage.getByText('Đã có lỗi hệ thống. Vui lòng thử lại.')).not.toBeVisible();
  }
  const headers = { Origin: origin };
  expect(
    (
      await page.request.patch(`/api/funds/${fundId}`, {
        headers,
        data: {
          bankBin: '970436',
          bankName: 'Ngân hàng minh họa kiểm thử',
          bankAccount: '0000000000',
          bankHolder: 'TAI KHOAN KIEM THU',
          bankPublicConsent: true,
        },
      })
    ).ok(),
  ).toBeTruthy();
  const requestResponse = await publicPage.request.post(`/api/public/funds/${slug}/contribute`, {
    headers,
    data: { amount: '500000', publicName: 'Ẩn danh' },
  });
  expect(requestResponse.ok()).toBeTruthy();
  const contribution = (await requestResponse.json()).data;
  expect(contribution.status).toBe('PENDING');
  const premature = await page.request.post(
    `/api/contribution-requests/${contribution.id}/confirm`,
    { headers, data: { transactionId: pending.id } },
  );
  expect(premature.ok()).toBeFalsy();
  const workbook = new ExcelJS.Workbook();
  const statement = workbook.addWorksheet('Sao kê');
  statement.addRow(['date', 'description', 'amount', 'reference']);
  statement.addRow([
    new Date().toISOString().slice(0, 10),
    contribution.reference,
    500000,
    'BANK-' + suffix,
  ]);
  const preview = await page.request.post('/api/statements/preview', {
    headers,
    multipart: {
      fundId,
      file: {
        name: 'statement.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      },
    },
  });
  expect(preview.ok()).toBeTruthy();
  expect((await preview.json()).data.rows[0][2]).toBe('500000');
  const statementData = {
    fundId,
    filename: 'statement.xlsx',
    rows: [
      {
        reference: 'BANK-' + suffix,
        description: contribution.reference,
        amount: '500000',
        occurredAt: new Date().toISOString(),
      },
    ],
  };
  expect(
    (
      await (
        await page.request.post('/api/statements/import', { headers, data: statementData })
      ).json()
    ).data.inserted,
  ).toBe(1);
  expect(
    (
      await (
        await page.request.post('/api/statements/import', { headers, data: statementData })
      ).json()
    ).data.duplicates,
  ).toBe(1);
  const bank = (await (await page.request.get(`/api/reconciliations?fundId=${fundId}`)).json()).data
    .bank;
  expect(
    (
      await page.request.post('/api/reconciliations', {
        headers,
        data: { bankTransactionId: bank[0].id, transactionId: pending.id },
      })
    ).ok(),
  ).toBeTruthy();
  const confirmed = await page.request.post(
    `/api/contribution-requests/${contribution.id}/confirm`,
    { headers, data: { transactionId: pending.id } },
  );
  expect(confirmed.ok()).toBeTruthy();
  expect((await confirmed.json()).data.status).toBe('CONFIRMED');
  expect(
    (await (await page.request.get(`/api/public/funds/${slug}/statistics`)).json()).data.closing,
  ).toBe('500000');
  await approverContext.close();
  await publicContext.close();
});

test('anonymous public routes, private protection and metadata', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Cùng góp quỹ/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  const missing = await page.request.get('/api/public/funds/does-not-exist');
  expect(missing.status()).toBe(404);
  expect((await page.request.get('/sitemap.xml')).ok()).toBeTruthy();
  await expect(page.getByLabel('Địa chỉ email')).toBeVisible();
});
