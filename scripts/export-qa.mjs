import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ExcelJS from 'exceljs';
const base = process.env.QA_BASE_URL || 'http://localhost:3139';
await fs.mkdir('data/qa', { recursive: true });
const evidence = [];
for (const format of ['csv', 'xlsx', 'pdf']) {
  const response = await fetch(`${base}/api/public/funds/quy-song-xanh/reports?format=${format}`);
  assert(response.ok, `Export ${format}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (format === 'xlsx') {
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(bytes);
    const sheet = book.getWorksheet('Thu chi');
    assert(sheet && sheet.rowCount > 1);
    assert.equal(sheet.getCell('A1').value, 'Mã giao dịch');
    let net = 0n;
    for (let i = 2; i <= sheet.rowCount; i++) {
      const value = sheet.getCell(`G${i}`).value;
      assert.equal(typeof value, 'number');
      assert(Number.isSafeInteger(value));
      net += BigInt(value);
    }
    assert.equal(net, 34120000n);
    evidence.push({ format, rows: sheet.rowCount - 1, net: String(net) });
  } else if (format === 'csv') {
    assert(bytes.toString().includes('Mã giao dịch'));
    assert(!bytes.toString().includes('owner@dongquy.local'));
    evidence.push({ format, bytes: bytes.length });
  } else {
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    evidence.push({ format, bytes: bytes.length });
  }
  await fs.writeFile(`data/qa/export.${format}`, bytes);
}
await fs.writeFile('data/qa/exports.json', JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
