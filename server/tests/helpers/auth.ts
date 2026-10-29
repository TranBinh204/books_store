import { pool } from '../../src/db/pool';
import { hashPassword } from '../../src/utils/password';
import type { Response } from 'supertest';

export const validRegisterBody = {
  fullName: 'Nguyễn Văn A',
  phone: '0912345678',
  email: 'a@gmail.com',
  password: 'matkhau123',
};

export interface TestTokens {
  accessToken: string;
  refreshToken: string;
}

/** Lấy cặp token từ response của /auth/login hoặc /auth/refresh */
export function getTokens(res: Response): TestTokens {
  const tokens = res.body?.data?.tokens as TestTokens | undefined;
  if (!tokens?.accessToken || !tokens.refreshToken) {
    throw new Error(`Response không có token: ${JSON.stringify(res.body)}`);
  }
  return tokens;
}

/** Header Authorization cho access token */
export function bearer(accessToken: string): string {
  return `Bearer ${accessToken}`;
}

/**
 * Tạo sẵn tài khoản CUSTOMER thẳng trong DB (bỏ qua bước xác minh OTP của /auth/register) → id.
 * Đăng nhập bằng `body.email` + `body.password` như bình thường.
 */
export async function createCustomer(body: typeof validRegisterBody = validRegisterBody) {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO users (full_name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id`,
    [body.fullName, body.email.trim().toLowerCase(), body.phone, await hashPassword(body.password)],
  );
  return rows[0].id;
}
