export const MAX_AMOUNT = 1_000_000_000_000n;
export function vnd(value: bigint | string | number | null | undefined) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(BigInt(value ?? 0));
}
export function sum(values: bigint[]) {
  return values.reduce((a, b) => a + b, 0n);
}
export function dueSummary(amount: bigint, adjustments: bigint[], received: bigint[]) {
  const required = amount + sum(adjustments);
  const paid = sum(received);
  return {
    required,
    paid,
    remaining: required > paid ? required - paid : 0n,
    overpaid: paid > required ? paid - required : 0n,
  };
}
export function journal(
  type: string,
  amount: bigint,
  fundId: string,
  targetFundId?: string | null,
) {
  if (amount <= 0n || amount > MAX_AMOUNT) throw new Error('Số tiền không hợp lệ');
  if (type === 'TRANSFER') {
    if (!targetFundId || fundId === targetFundId) throw new Error('Quỹ đích không hợp lệ');
    return [
      { fundId, account: 'CASH', amount: -amount },
      { fundId: targetFundId, account: 'CASH', amount },
    ];
  }
  const cash = type === 'EXPENSE' ? -amount : amount;
  return [
    { fundId, account: 'CASH', amount: cash },
    { fundId, account: 'COUNTER', amount: -cash },
  ];
}
export function safeCell(value: string) {
  return /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
}
export function csvCell(value: string) {
  return '"' + safeCell(value).replaceAll('"', '""') + '"';
}
export function dateLabel(value: string | Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}
