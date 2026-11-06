import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { fundAccess, managers, writers } from './policy';
import { ensure } from './errors';
import { serial, audit } from './audit';
export function sniffMime(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  if (
    bytes.toString('ascii', 0, 5) === '%PDF-' &&
    !/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(bytes.toString('latin1'))
  )
    return 'application/pdf';
  return null;
}
const storageRoot = () =>
  path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || 'uploads');
export async function uploadAttachment(userId: string, form: FormData) {
  const file = form.get('file');
  const fundId = String(form.get('fundId') || '');
  const transactionId = String(form.get('transactionId') || '');
  ensure(file instanceof File && file.size > 0, 'VALIDATION_ERROR', 'Chọn tệp chứng từ.');
  ensure(file.size <= 10 * 1024 * 1024, 'FILE_TOO_LARGE', 'Tệp tối đa 10 MiB.', 413);
  const { fund } = await fundAccess(userId, fundId, writers);
  if (transactionId) {
    const tx = await db.transaction.findUnique({ where: { id: transactionId } });
    ensure(tx?.fundId === fundId, 'FORBIDDEN', 'Giao dịch không thuộc quỹ.', 403);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const mimeType = sniffMime(bytes);
  ensure(
    mimeType,
    'VALIDATION_ERROR',
    'Chỉ nhận PDF không có nội dung chủ động, PNG, JPG, WebP đúng định dạng.',
  );
  const storageKey = randomUUID();
  await mkdir(storageRoot(), { recursive: true });
  await writeFile(
    /* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ storageRoot(), storageKey),
    bytes,
    { flag: 'wx' },
  );
  return serial(async (client) => {
    const attachment = await client.attachment.create({
      data: {
        fundId,
        transactionId: transactionId || null,
        originalName: path
          .basename(file.name)
          .replace(/[\x00-\x1f]/g, '')
          .slice(0, 160),
        storageKey,
        mimeType,
        size: bytes.length,
        uploadedBy: userId,
      },
    });
    await audit(client, userId, fund.groupId, 'DOCUMENT_UPLOADED', attachment.id);
    return { id: attachment.id, originalName: attachment.originalName };
  });
}
export async function publishAttachment(
  userId: string,
  id: string,
  isPublic: boolean,
  reviewed: boolean,
) {
  return serial(async (client) => {
    const attachment = await client.attachment.findUnique({ where: { id } });
    ensure(attachment, 'NOT_FOUND', 'Không tìm thấy tệp.', 404);
    const { fund } = await fundAccess(userId, attachment.fundId, managers, client);
    ensure(
      !isPublic || reviewed,
      'VALIDATION_ERROR',
      'Xác nhận đã che thông tin cá nhân trên bản tệp công khai.',
    );
    const result = await client.attachment.update({
      where: { id },
      data: { isPublic, reviewed, reviewedBy: reviewed ? userId : null },
    });
    await audit(client, userId, fund.groupId, 'DOCUMENT_VISIBILITY_UPDATED', id, {
      isPublic,
      reviewed,
    });
    return { id: result.id, isPublic: result.isPublic };
  });
}
export async function downloadAttachment(id: string, userId?: string) {
  const attachment = await db.attachment.findUnique({
    where: { id },
    include: { fund: { include: { group: true } }, transaction: true },
  });
  ensure(attachment, 'NOT_FOUND', 'Không tìm thấy tệp.', 404);
  const publicAllowed =
    attachment.isPublic &&
    attachment.reviewed &&
    attachment.fund.visibility !== 'PRIVATE' &&
    attachment.fund.active &&
    attachment.fund.group.active &&
    (!attachment.transaction ||
      (attachment.transaction.status === 'POSTED' && attachment.transaction.isPublic));
  if (!publicAllowed) {
    ensure(userId, 'NOT_FOUND', 'Không tìm thấy tệp.', 404);
    await fundAccess(userId, attachment.fundId);
  }
  const bytes = await readFile(
    /* turbopackIgnore: true */ path.join(
      /* turbopackIgnore: true */ storageRoot(),
      attachment.storageKey,
    ),
  );
  return new Response(bytes, {
    headers: {
      'Content-Type': attachment.mimeType,
      'Content-Length': String(bytes.length),
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
    },
  });
}
