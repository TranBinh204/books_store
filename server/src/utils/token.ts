import { createHash, randomBytes } from 'node:crypto';

/** Token ngẫu nhiên 32 byte dạng hex (64 ký tự) — dùng cho refresh token, token đặt lại mật khẩu */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/** Chỉ lưu bản băm SHA-256 vào DB, không lưu token gốc */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
