/** BOM UTF-8 — Excel nhận đúng tiếng Việt khi mở file CSV */
const BOM = '﻿';

/** Ô bắt đầu bằng các ký tự này bị Excel hiểu là công thức (CSV injection) */
const FORMULA_START = /^[=+\-@\t\r]/;

type Cell = string | number | null | undefined;

/** 1 ô CSV: số giữ nguyên · chuỗi chặn công thức, bọc "" khi có dấu phẩy / ngoặc kép / xuống dòng */
export function csvCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Dòng tiêu đề + các dòng dữ liệu → nội dung file CSV (có BOM, xuống dòng CRLF) */
export function toCsv(header: string[], rows: Cell[][]): string {
  return BOM + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
