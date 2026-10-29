import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.url(),
  DATABASE_URL_TEST: z.url().optional(),
  CLIENT_URL: z.url().default('http://localhost:3000'),

  // Xác thực (M01) — mọi thông số đặt trong server/.env, không có giá trị mặc định trong code
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải dài ít nhất 32 ký tự'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive(),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive(),
  REFRESH_REUSE_GRACE_SECONDS: z.coerce.number().int().nonnegative(),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive(),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15),
  // Xác minh email khi đăng ký bằng mã OTP 6 số (M01-F01)
  REGISTER_OTP_TTL_MINUTES: z.coerce.number().int().positive(),
  REGISTER_OTP_MAX_ATTEMPTS: z.coerce.number().int().positive(),
  REGISTER_OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative(),

  // Giới hạn số request theo IP (chống dò mật khẩu / spam) — RATE_LIMIT_ENABLED=false để tắt khi dev
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).transform((value) => value === 'true'),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_LOGIN_WINDOW_MINUTES: z.coerce.number().positive(),
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_REGISTER_WINDOW_MINUTES: z.coerce.number().positive(),
  RATE_LIMIT_REGISTER_VERIFY_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_REGISTER_VERIFY_WINDOW_MINUTES: z.coerce.number().positive(),
  RATE_LIMIT_REGISTER_RESEND_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_REGISTER_RESEND_WINDOW_MINUTES: z.coerce.number().positive(),
  RATE_LIMIT_FORGOT_PASSWORD_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MINUTES: z.coerce.number().positive(),
  RATE_LIMIT_RESET_PASSWORD_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_RESET_PASSWORD_WINDOW_MINUTES: z.coerce.number().positive(),
  RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_REFRESH_WINDOW_MINUTES: z.coerce.number().positive(),
  RATE_LIMIT_CHANGE_PASSWORD_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_CHANGE_PASSWORD_WINDOW_MINUTES: z.coerce.number().positive(),

  // Admin mặc định — tạo khi server khởi động nếu DB chưa có tài khoản ADMIN nào (bỏ trống = không tạo)
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().optional(),

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
