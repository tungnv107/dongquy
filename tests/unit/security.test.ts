import { describe, expect, it } from 'vitest';
import { deflateRawSync, crc32 } from 'node:zlib';
import ExcelJS from 'exceljs';
import { requestIp } from '../../src/lib/request-ip';
import { checkZipSize } from '../../src/lib/zip-validation';
import { parseCSV } from '../../src/lib/banking';

function compressedZip(bytes: Buffer, declaredSize = bytes.length) {
  const compressed = deflateRawSync(bytes);
  const name = Buffer.from('xl/worksheets/sheet1.xml');
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc32(bytes), 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(declaredSize, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc32(bytes), 16);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(declaredSize, 24);
  central.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12);
  end.writeUInt32LE(local.length + name.length + compressed.length, 16);
  return Buffer.concat([local, name, compressed, central, name, end]);
}

describe('Trusted proxy rate-limit identity', () => {
  const request = (value: string) =>
    new Request('http://localhost', {
      headers: { 'x-forwarded-for': value },
    });
  it('ignores attacker-controlled addresses prepended to the proxy chain', () => {
    expect(requestIp(request('1.2.3.4, 203.0.113.9'), true)).toBe('203.0.113.9');
    expect(requestIp(request('9.8.7.6, 203.0.113.9'), true)).toBe('203.0.113.9');
  });
  it('does not trust headers in direct mode or malformed addresses', () => {
    expect(requestIp(request('1.2.3.4'), false)).toBe('direct');
    expect(requestIp(request('arbitrary-bucket'), true)).toBe('proxy');
  });
  it('normalizes equivalent IPv6 addresses', () => {
    expect(requestIp(request('2001:0db8:0000:0000:0000:0000:0000:0001'), true)).toBe(
      requestIp(request('2001:db8::1'), true),
    );
  });
});

describe('Untrusted statement files', () => {
  it('accepts a normal XLSX file', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Statement').addRows([
      ['date', 'amount'],
      ['2026-11-01', 100],
    ]);
    await expect(
      checkZipSize(Buffer.from(await workbook.xlsx.writeBuffer())),
    ).resolves.toBeUndefined();
  });
  it('rejects forged uncompressed sizes before ExcelJS parses the archive', async () => {
    await expect(checkZipSize(compressedZip(Buffer.alloc(2 * 1024 * 1024, 65), 1))).rejects.toThrow(
      'không hợp lệ',
    );
  });
  it('rejects real expansions above 30 MiB', async () => {
    await expect(checkZipSize(compressedZip(Buffer.alloc(31 * 1024 * 1024, 65)))).rejects.toThrow(
      'quá lớn',
    );
  });
  it('limits columns on every CSV row, including the final row', () => {
    expect(() => parseCSV('a,b\n' + Array(51).fill('x').join(','))).toThrow('50 cột');
    expect(() => parseCSV('a,b\n' + Array(51).fill('x').join(',') + '\n')).toThrow('50 cột');
  });
  it('accepts exactly 1000 CSV data rows and rejects 1001', () => {
    expect(parseCSV('a,b\n' + Array(1000).fill('x,y').join('\n'))).toHaveLength(1001);
    expect(() => parseCSV('a,b\n' + Array(1001).fill('x,y').join('\n'))).toThrow('1.000');
  });
});
