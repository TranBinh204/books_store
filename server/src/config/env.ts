import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.url(),
  DATABASE_URL_TEST: z.url().optional(),
  CLIENT_URL: z.url().default('http://localhost:3000'),

  // Xác thực — mọi thông số đặt trong server/.env, không có giá trị mặc định trong code
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải dài ít nhất 32 ký tự'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15),

  // Giới hạn số request theo IP (chống dò mật khẩu / spam) — RATE_LIMIT_ENABLED=false để tắt khi dev
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).transform((value) => value === 'true'),

  // Email
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  MAIL_FROM: z.string().default('BookStore <no-reply@bookstore.local>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Biến môi trường không hợp lệ:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  // Khi chạy test, dùng DB riêng để không ảnh hưởng dữ liệu thật
  DATABASE_URL:
    data.NODE_ENV === 'test' && data.DATABASE_URL_TEST ? data.DATABASE_URL_TEST : data.DATABASE_URL,
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
};
