import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import { db } from './db';
import { serial, audit, notifyGroup } from './audit';
import { fundAccess, writers } from './policy';
import { ensure } from './errors';
import { date, text } from './validation';
import { checkZipSize } from './zip-validation';
export { checkZipSize } from './zip-validation';

export function fingerprint(
  fundId: string,
  reference: string,
  occurredAt: Date,
  amount: bigint,
  description: string,
) {
  return createHash('sha256')
    .update(
      [
        fundId,
        reference.trim(),
        occurredAt.toISOString().slice(0, 10),
        amount.toString(),
        description.trim().normalize('NFC'),
      ].join('|'),
    )
    .digest('hex');
}
export function parseCSV(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const firstLine = source.split(/\r?\n/)[0];
  const separator = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === separator && !quoted) {
      ensure(row.length < 49, 'VALIDATION_ERROR', 'Sao kê tối đa 50 cột.');
      row.push(field);
      field = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
    ensure(
      rows.length <= 1001 && field.length <= 10000,
      'VALIDATION_ERROR',
      'Sao kê vượt giới hạn 1.000 dòng hoặc độ dài ô.',
    );
  }
  ensure(!quoted, 'VALIDATION_ERROR', 'CSV có dấu ngoặc kép chưa đóng.');
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  ensure(rows.length <= 1001, 'VALIDATION_ERROR', 'Sao kê tối đa 1.000 dòng dữ liệu.');
  return rows;
}
export async function previewStatement(file: File) {
  ensure(file.size <= 5 * 1024 * 1024, 'FILE_TOO_LARGE', 'Sao kê tối đa 5 MiB.', 413);
  const buffer = Buffer.from(await file.arrayBuffer());
  let rows: string[][];
  if (file.name.toLowerCase().endsWith('.csv'))
    rows = parseCSV(buffer.toString('utf8').replace(/^\uFEFF/, ''));
  else {
    ensure(
      file.name.toLowerCase().endsWith('.xlsx'),
      'VALIDATION_ERROR',
      'Chỉ chấp nhận CSV hoặc XLSX.',
    );
    await checkZipSize(buffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.worksheets[0];
    ensure(
      sheet && sheet.rowCount <= 1001 && sheet.columnCount <= 50,
      'VALIDATION_ERROR',
      'Sao kê tối đa 1.000 dòng, 50 cột.',
    );
    rows = [];
    sheet.eachRow((row) => {
      const values: string[] = [];
      for (let i = 1; i <= sheet.columnCount; i++) {
        const cell = row.getCell(i);
        values.push(cell.value instanceof Date ? cell.value.toISOString().slice(0, 10) : cell.text);
      }
      rows.push(values);
    });
  }
  ensure(
    rows.length > 1 && rows[0].length <= 50,
    'VALIDATION_ERROR',
    'Sao kê cần dòng tiêu đề và dữ liệu.',
  );
  return { headers: rows[0], rows: rows.slice(1), filename: file.name };
}
const bankRow = z.object({
  reference: z.string().trim().max(150),
  description: z.string().trim().min(1).max(500),
  occurredAt: date,
  amount: z
    .union([z.string().regex(/^-?\d+$/), z.number().int().safe()])
    .transform(BigInt)
    .refine((v) => v !== 0n && v >= -1_000_000_000_000n && v <= 1_000_000_000_000n),
});
export async function importStatement(userId: string, input: unknown) {
  const data = z
    .object({ fundId: text, filename: text, rows: z.array(bankRow).min(1).max(1000) })
    .parse(input);
  return serial(async (client) => {
    const { fund } = await fundAccess(userId, data.fundId, writers, client);
    const rows = data.rows.map((row) => ({
      ...row,
      fundId: fund.id,
      fingerprint: fingerprint(fund.id, row.reference, row.occurredAt, row.amount, row.description),
    }));
    const { count } = await client.bankTransaction.createMany({ data: rows, skipDuplicates: true });
    const imported = await client.statementImport.create({
      data: { fundId: fund.id, filename: data.filename, actorId: userId, count },
    });
    await audit(client, userId, fund.groupId, 'STATEMENT_IMPORTED', imported.id, {
      inserted: count,
      duplicates: rows.length - count,
    });
    if (count)
      await notifyGroup(
        client,
        fund.groupId,
        'Sao kê cần đối soát',
        `${count} dòng sao kê mới cần kiểm tra.`,
        '/dashboard/reconciliation',
      );
    return { inserted: count, duplicates: rows.length - count, id: imported.id };
  });
}
export async function reconciliationList(userId: string, fundId: string) {
  await fundAccess(userId, fundId, writers);
  const [bank, transactions] = await Promise.all([
    db.bankTransaction.findMany({
      where: { fundId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
      include: { reconciliation: true },
    }),
    db.transaction.findMany({
      where: {
        fundId,
        status: 'POSTED',
        type: { in: ['INCOME', 'EXPENSE'] },
        reconciliation: null,
        reversedBy: null,
      },
      orderBy: { occurredAt: 'desc' },
      take: 200,
      select: {
        id: true,
        code: true,
        type: true,
        amount: true,
        description: true,
        occurredAt: true,
      },
    }),
  ]);
  return {
    bank: bank.map((b) => ({
      ...b,
      suggestions: transactions.filter(
        (t) =>
          (t.type === 'EXPENSE' ? -t.amount : t.amount) === b.amount &&
          Math.abs(t.occurredAt.getTime() - b.occurredAt.getTime()) < 7 * 86400000,
      ),
    })),
    transactions,
  };
}
export async function reconcile(userId: string, input: unknown) {
  const data = z
    .object({ bankTransactionId: text, transactionId: text, note: z.string().max(500).default('') })
    .parse(input);
  return serial(async (client) => {
    const bank = await client.bankTransaction.findUnique({ where: { id: data.bankTransactionId } });
    ensure(bank, 'NOT_FOUND', 'Không tìm thấy dòng sao kê.', 404);
    const { fund } = await fundAccess(userId, bank.fundId, writers, client);
    const tx = await client.transaction.findUnique({
      where: { id: data.transactionId },
      include: { reversedBy: true },
    });
    ensure(
      tx &&
        tx.fundId === bank.fundId &&
        tx.status === 'POSTED' &&
        ['INCOME', 'EXPENSE'].includes(tx.type) &&
        !tx.reversedBy,
      'VALIDATION_ERROR',
      'Giao dịch cần cùng quỹ, đã ghi sổ và chưa đảo.',
    );
    ensure(
      (tx.type === 'EXPENSE' ? -tx.amount : tx.amount) === bank.amount,
      'AMOUNT_MISMATCH',
      'Số tiền hoặc chiều tiền không khớp. Kiểm tra hoặc tạo bút toán điều chỉnh trước.',
      409,
    );
    const result = await client.reconciliation.create({ data: { ...data, actorId: userId } });
    await audit(client, userId, fund.groupId, 'RECONCILED', result.id, {
      transactionId: tx.id,
      bankTransactionId: bank.id,
    });
    return result;
  });
}
export async function receiveWebhook(
  raw: string,
  timestamp: string | null,
  signature: string | null,
) {
  const secret = process.env.BANK_WEBHOOK_SECRET;
  ensure(secret && secret.length >= 32, 'NOT_CONFIGURED', 'Webhook chưa được cấu hình.', 503);
  ensure(
    timestamp &&
      /^\d+$/.test(timestamp) &&
      Math.abs(Date.now() - Number(timestamp) * 1000) < 300000,
    'FORBIDDEN',
    'Webhook đã hết hạn.',
    403,
  );
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  ensure(
    signature &&
      /^[0-9a-f]{64}$/i.test(signature) &&
      timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex')),
    'FORBIDDEN',
    'Chữ ký webhook không hợp lệ.',
    403,
  );
  const data = z
    .object({ eventId: text, fundId: text, transaction: bankRow })
    .parse(JSON.parse(raw));
  const payloadHash = createHash('sha256').update(raw).digest('hex');
  return serial(async (client) => {
    const existing = await client.webhookEvent.findUnique({
      where: { provider_eventId: { provider: 'GENERIC_HMAC', eventId: data.eventId } },
    });
    if (existing) {
      ensure(
        existing.payloadHash === payloadHash,
        'CONFLICT',
        'Event ID trùng nhưng nội dung khác.',
        409,
      );
      return { duplicate: true };
    }
    const fund = await client.fund.findUnique({ where: { id: data.fundId } });
    ensure(fund?.active, 'NOT_FOUND', 'Quỹ không hợp lệ.', 404);
    await client.webhookEvent.create({
      data: {
        provider: 'GENERIC_HMAC',
        eventId: data.eventId,
        payloadHash,
        payload: JSON.parse(raw),
      },
    });
    const row = data.transaction;
    await client.bankTransaction.createMany({
      data: [
        {
          ...row,
          fundId: fund.id,
          source: 'WEBHOOK',
          fingerprint: fingerprint(
            fund.id,
            row.reference,
            row.occurredAt,
            row.amount,
            row.description,
          ),
        },
      ],
      skipDuplicates: true,
    });
    await audit(client, null, fund.groupId, 'WEBHOOK_QUEUED', data.eventId, {
      provider: 'GENERIC_HMAC',
    });
    return { duplicate: false, status: 'AWAITING_RECONCILIATION' };
  });
}
