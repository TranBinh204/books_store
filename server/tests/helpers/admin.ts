import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import { hashPassword } from '../../src/utils/password';
import { bearer, createCustomer, getTokens, validRegisterBody } from './auth';

/** Tạo tài khoản ADMIN trong DB test rồi đăng nhập → header Authorization */
export async function loginAsAdmin(email = 'admin@test.vn', password = 'admin12345') {
  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES ('Admin Test', $1, $2, 'ADMIN')
     ON CONFLICT (email) DO NOTHING`,
    [email, await hashPassword(password)],
  );
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return bearer(getTokens(res).accessToken);
}

/** Tạo & đăng nhập tài khoản CUSTOMER → header Authorization */
export async function loginAsCustomer() {
  await createCustomer();
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: validRegisterBody.email, password: validRegisterBody.password });
  return bearer(getTokens(res).accessToken);
}

/** Header PNG hợp lệ (đủ để nhận diện định dạng) */
export const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
