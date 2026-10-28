/** Lỗi vi phạm UNIQUE của PostgreSQL (mã 23505), tuỳ chọn khớp tên constraint / index */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const pgError = err as { code?: string; constraint?: string };
  return pgError.code === '23505' && (!constraint || pgError.constraint === constraint);
}

/** Lỗi vi phạm khoá ngoại (mã 23503) — vd xoá bản ghi đang được tham chiếu */
export function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23503';
}
