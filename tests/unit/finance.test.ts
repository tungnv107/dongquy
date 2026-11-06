import { describe, it, expect } from 'vitest';
import { journal, sum, dueSummary, safeCell, csvCell } from '../../src/lib/money';
import { parseCSV, fingerprint, checkZipSize } from '../../src/lib/banking';
import { sniffMime } from '../../src/lib/files';
import { transactionInput } from '../../src/lib/validation';
it('Ngày giao dịch không thể nằm sau thời điểm hiện tại', () => {
  const base = { fundId: 'fund', type: 'INCOME', amount: '500000', description: 'Test date' };
  expect(
    transactionInput.safeParse({ ...base, occurredAt: new Date(Date.now() - 60000) }).success,
  ).toBe(true);
  expect(
    transactionInput.safeParse({ ...base, occurredAt: new Date(Date.now() + 3600000) }).success,
  ).toBe(false);
});
describe('Sổ tiền VND nguyên', () => {
  it('Thu và chi cân đối theo tài khoản', () => {
    expect(journal('INCOME', 500000n, 'a')).toEqual([
      { fundId: 'a', account: 'CASH', amount: 500000n },
      { fundId: 'a', account: 'COUNTER', amount: -500000n },
    ]);
    expect(journal('EXPENSE', 120000n, 'a')[0].amount).toBe(-120000n);
  });
  it('Chuyển quỹ không làm tăng tài sản toàn nhóm', () => {
    const entries = journal('TRANSFER', 500000n, 'a', 'b');
    expect(sum(entries.map((e) => e.amount))).toBe(0n);
    expect(entries.every((e) => e.account === 'CASH')).toBe(true);
    expect(() => journal('TRANSFER', 1n, 'a', 'a')).toThrow();
  });
  it('Đảo giao dịch khôi phục số dư gốc', () => {
    const entries = journal('EXPENSE', 120000n, 'a');
    const reversed = entries.map((e) => ({ ...e, amount: -e.amount }));
    expect(entries[0].amount + reversed[0].amount).toBe(0n);
    expect(sum(reversed.map((e) => e.amount))).toBe(0n);
  });
  it('Bigint không mất độ chính xác ở tổng vượt giới hạn number', () =>
    expect(sum([9007199254740991n, 8n])).toBe(9007199254740999n));
  it('Từ chối tiền 0, âm hoặc vượt hạn mức', () => {
    for (const amount of [0n, -1n, 1000000000001n])
      expect(() => journal('INCOME', amount, 'a')).toThrow();
  });
});
describe('Nghĩa vụ và thực nhận', () => {
  it('Nợ chưa đóng không phải tiền đã thu', () =>
    expect(dueSummary(500000n, [], [])).toEqual({
      required: 500000n,
      paid: 0n,
      remaining: 500000n,
      overpaid: 0n,
    }));
  it('Tính thanh toán một phần, giảm và đóng dư', () => {
    expect(dueSummary(500000n, [-100000n], [200000n]).remaining).toBe(200000n);
    expect(dueSummary(500000n, [-100000n], [600000n]).overpaid).toBe(200000n);
  });
});
describe('Sao kê và bảo vệ tệp', () => {
  it('Đọc CSV có nội dung dấu phẩy, xuống dòng và dấu ngoặc', () =>
    expect(
      parseCSV(
        'date,description,amount\r\n2026-11-01,"Đóng góp, tháng 11",500000\r\n2026-11-02,"Một\nhoạt động ""chung""",-120000',
      ),
    ).toEqual([
      ['date', 'description', 'amount'],
      ['2026-11-01', 'Đóng góp, tháng 11', '500000'],
      ['2026-11-02', 'Một\nhoạt động "chung"', '-120000'],
    ]));
  it('Khử trùng nhất quán; phân biệt quỹ và chiều tiền', () => {
    const date = new Date('2026-11-01');
    const fp = fingerprint('a', 'REF', date, 10n, 'thu');
    expect(fp).toBe(fingerprint('a', ' REF ', date, 10n, 'thu'));
    expect(fp).not.toBe(fingerprint('b', 'REF', date, 10n, 'thu'));
    expect(fp).not.toBe(fingerprint('a', 'REF', date, -10n, 'thu'));
  });
  it('Tránh công thức CSV và giữ escape hợp lệ', () => {
    expect(safeCell('=HYPERLINK("evil")')).toBe('\'=HYPERLINK("evil")');
    expect(csvCell('hello,"world"')).toBe('"hello,""world"""');
  });
  it('Không chấp nhận HTML, SVG hay PDF có nội dung chủ động', () => {
    expect(sniffMime(Buffer.from('<html>bad</html>'))).toBeNull();
    expect(sniffMime(Buffer.from('<svg></svg>'))).toBeNull();
    expect(sniffMime(Buffer.from('%PDF-1.4 /JavaScript'))).toBeNull();
    expect(sniffMime(Buffer.from('%PDF-1.4\n safe'))).toBe('application/pdf');
  });
  it('Từ chối tệp nén không hợp lệ', async () =>
    await expect(checkZipSize(Buffer.alloc(100))).rejects.toThrow());
});
