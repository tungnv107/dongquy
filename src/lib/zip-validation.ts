import { fromBufferPromise } from 'yauzl';
import { AppError, ensure } from './errors';

const MAX_UNCOMPRESSED = 30 * 1024 * 1024;

export async function checkZipSize(buffer: Buffer) {
  const message = 'Tệp Excel nén có kích thước giải nén quá lớn hoặc không hợp lệ.';
  let archive;
  try {
    archive = await fromBufferPromise(buffer, { validateEntrySizes: true, strictFileNames: true });
    ensure(archive.entryCount > 0 && archive.entryCount < 1000, 'VALIDATION_ERROR', message);
    let declared = 0;
    let actual = 0;
    const names = new Set<string>();
    for await (const entry of archive.eachEntry()) {
      ensure(!names.has(entry.fileName) && !entry.isEncrypted(), 'VALIDATION_ERROR', message);
      names.add(entry.fileName);
      declared += entry.uncompressedSize;
      ensure(declared <= MAX_UNCOMPRESSED, 'VALIDATION_ERROR', message);
      // Drain every entry with validation enabled before handing the archive to
      // ExcelJS. Forged central-directory sizes cannot bypass this byte budget.
      const stream = await archive.openReadStreamPromise(entry);
      try {
        for await (const chunk of stream) {
          actual += chunk.length;
          ensure(actual <= MAX_UNCOMPRESSED, 'VALIDATION_ERROR', message);
        }
      } finally {
        stream.destroy();
      }
    }
  } catch {
    throw new AppError('VALIDATION_ERROR', message);
  } finally {
    archive?.close();
  }
}
