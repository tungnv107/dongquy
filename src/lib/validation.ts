import { z } from 'zod';
import { MAX_AMOUNT } from './money';
import { ensure } from './errors';
export const text = z.string().trim().min(1).max(500);
export const money = z
  .union([z.string().regex(/^\d+$/), z.number().int().safe()])
  .transform((v) => BigInt(v))
  .refine((v) => v > 0n && v <= MAX_AMOUNT, 'Số tiền phải từ 1 đến 1.000 tỷ đồng');
export const nonnegative = z
  .union([z.string().regex(/^\d+$/), z.number().int().safe()])
  .transform((v) => BigInt(v))
  .refine((v) => v >= 0n && v <= MAX_AMOUNT);
export const date = z.coerce.date();
export const roles = z
  .array(z.enum(['OWNER', 'MANAGER', 'TREASURER', 'APPROVER', 'MEMBER']))
  .min(1);
export const slug = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');
export const transactionInput = z
  .object({
    fundId: text,
    targetFundId: text.optional(),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'OPENING']),
    amount: money,
    description: text,
    publicDescription: z.string().trim().max(500).default(''),
    isPublic: z.boolean().default(false),
    categoryId: text.optional(),
    contributorId: text.optional(),
    recipient: z.string().max(150).default(''),
    paymentMethod: z.enum(['BANK', 'CASH', 'OTHER']).default('BANK'),
    bankReference: z.string().max(150).default(''),
    occurredAt: date,
  })
  .refine(
    (v) => !v.isPublic || v.publicDescription.length > 0,
    'Cần nội dung đã kiểm tra để công khai',
  )
  .refine((v) => v.occurredAt.getTime() <= Date.now(), 'Ngày giao dịch không được ở tương lai');
export const groupInput = z.object({
  name: text,
  slug,
  description: z.string().max(2000).default(''),
  representative: z.string().max(150).default(''),
  logoUrl: z.url().startsWith('https://').max(2000).or(z.literal('')).optional(),
  coverUrl: z.url().startsWith('https://').max(2000).or(z.literal('')).optional(),
  foundedAt: date.optional(),
});
export const fundInput = z.object({
  groupId: text,
  name: text,
  slug,
  description: z.string().max(3000).default(''),
  purpose: z.string().max(1000).default('Cùng góp sức cho những điều ý nghĩa.'),
  type: z.enum(['GENERAL', 'REGULAR', 'EVENT', 'CHARITY', 'RESERVE', 'ANNUAL']).default('GENERAL'),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).default('PRIVATE'),
  allowIndex: z.boolean().default(false),
  showSummary: z.boolean().default(true),
  showContributors: z.boolean().default(false),
  allowExport: z.boolean().default(false),
  dualControl: z.boolean().default(true),
  active: z.boolean().default(true),
  lowBalance: nonnegative.default(1000000n),
  goalAmount: nonnegative.default(0n),
  bankBin: z
    .string()
    .regex(/^\d{6}$/)
    .or(z.literal(''))
    .default(''),
  bankName: z.string().max(100).default(''),
  bankAccount: z
    .string()
    .regex(/^[0-9A-Za-z]{4,30}$/)
    .or(z.literal(''))
    .default(''),
  bankHolder: z.string().max(100).default(''),
  bankPublicConsent: z.boolean().default(false),
  publicManager: z.string().max(100).default(''),
});
export function pagination(url: URL) {
  return {
    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .parse(url.searchParams.get('page') || undefined),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(12)
      .parse(url.searchParams.get('pageSize') || undefined),
  };
}
export function dates(url: URL) {
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const start = from ? date.parse(`${from}T00:00:00+07:00`) : undefined;
  const end = to ? date.parse(`${to}T23:59:59.999+07:00`) : undefined;
  ensure(
    !start || !end || start <= end,
    'VALIDATION_ERROR',
    'Ngày bắt đầu phải trước ngày kết thúc.',
  );
  return { start, end };
}
