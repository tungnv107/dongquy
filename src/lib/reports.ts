import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'node:path';
import { transactionList, statistics } from './queries';
import { fundAccess, visibleFund } from './policy';
import { dates } from './validation';
import { ensure } from './errors';
import { csvCell, safeCell, vnd, dateLabel } from './money';
import { audit } from './audit';
import { db } from './db';
export async function exportReport(
  url: URL,
  identity: { userId: string; fundId: string } | { slug: string },
) {
  const publicMode = 'slug' in identity;
  const fund = publicMode
    ? await visibleFund(identity.slug)
    : (await fundAccess(identity.userId, identity.fundId)).fund;
  if (publicMode)
    ensure(fund.allowExport, 'FORBIDDEN', 'Quỹ chưa cho phép xuất báo cáo công khai.', 403);
  const format = url.searchParams.get('format') || 'json';
  const { start, end } = dates(url);
  const query = new URL(url);
  query.searchParams.set('page', '1');
  query.searchParams.set('pageSize', '100');
  const first = await transactionList(fund.id, query, publicMode);
  if (format === 'json')
    return {
      statistics: fund.showSummary || !publicMode ? await statistics(fund.id, start, end) : null,
      transactions: first,
    };
  ensure(
    ['csv', 'xlsx', 'pdf'].includes(format),
    'VALIDATION_ERROR',
    'Định dạng báo cáo không hỗ trợ.',
  );
  ensure(
    first.total <= 5000,
    'VALIDATION_ERROR',
    'Báo cáo tối đa 5.000 giao dịch. Hãy thu hẹp khoảng ngày.',
  );
  const items = [...first.items];
  for (let page = 2; page <= Math.ceil(first.total / 100); page++) {
    query.searchParams.set('page', String(page));
    items.push(...(await transactionList(fund.id, query, publicMode)).items);
  }
  const rows = items.map((t) => [
    t.code,
    dateLabel(t.date),
    t.description,
    t.type,
    t.category,
    String(t.amount),
    String(t.cashAmount ?? 0),
  ]);
  const headers = [
    'Mã giao dịch',
    'Ngày',
    'Nội dung',
    'Loại',
    'Danh mục',
    'Số tiền VND',
    'Biến động VND',
  ];
  const filename = `bao-cao-${fund.slug}.${format}`;
  let bytes: Buffer;
  let contentType: string;
  if (format === 'csv') {
    bytes = Buffer.from(
      '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n'),
    );
    contentType = 'text/csv; charset=utf-8';
  } else if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Đồng Quỹ';
    const sheet = workbook.addWorksheet('Thu chi');
    sheet.addRow(headers);
    for (const row of rows)
      sheet.addRow(row.map((value, index) => (index >= 5 ? Number(value) : safeCell(value))));
    sheet.getColumn(6).numFmt = '#,##0" ₫"';
    sheet.getColumn(7).numFmt = '#,##0" ₫";[Red]-#,##0" ₫"';
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF102A43' } };
    sheet.columns.forEach((c, i) => {
      c.width = [22, 14, 54, 16, 28, 22, 22][i];
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = 'A1:G1';
    bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } else {
    bytes = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 40,
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.font(path.join(process.cwd(), 'public', 'fonts', 'BeVietnamPro-Regular.ttf'));
      doc.fontSize(20).fillColor('#102A43').text(`Báo cáo · ${fund.name}`);
      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text(
          `${publicMode ? 'Chỉ gồm giao dịch được công khai' : 'Báo cáo nội bộ'} · ${start ? dateLabel(start) : 'Từ khi thành lập'} — ${dateLabel(end ?? new Date())} · VND`,
        )
        .moveDown();
      for (const row of rows) {
        doc.fontSize(9);
        const rowHeight = Math.max(30, doc.heightOfString(row[2], { width: 370 }) + 10);
        if (doc.y + rowHeight > 520) doc.addPage();
        const y = doc.y;
        doc
          .fillColor('#102A43')
          .fontSize(9)
          .text(row[1], 40, y, { width: 80 })
          .text(row[2], 128, y, { width: 370 })
          .text(row[3], 510, y, { width: 90 })
          .text(vnd(row[6]), 610, y, { width: 145, align: 'right' });
        doc.y = y + rowHeight;
        doc.moveTo(40, doc.y).lineTo(800, doc.y).strokeColor('#e2e8f0').stroke();
        doc.moveDown(0.5);
      }
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .fillColor('#64748b')
          .text(`Đồng Quỹ · Trang ${i + 1}/${range.count}`, 40, 550, { lineBreak: false });
      }
      doc.end();
    });
    contentType = 'application/pdf';
  }
  if (!publicMode)
    await audit(db, identity.userId, fund.groupId, 'REPORT_EXPORTED', fund.id, {
      format,
      count: rows.length,
    });
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
