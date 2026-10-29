import { ZodError } from 'zod';
import { env } from '../config/env';
import * as userRepository from '../repositories/user.repository';
import { emailSchema, fullNameSchema, passwordSchema } from '../schemas/common.schema';
import { hashPassword } from '../utils/password';

export type SeedAdminResult = 'created' | 'exists' | 'skipped';

/**
 * Chạy khi server khởi động: DB chưa có tài khoản ADMIN nào → tạo Admin mặc định
 * từ ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME trong .env.
 * Đã có Admin → bỏ qua (không ghi đè mật khẩu). Cấu hình thiếu / sai → cảnh báo & bỏ qua.
 */
export async function seedDefaultAdmin(): Promise<SeedAdminResult> {
  if (await userRepository.existsAdmin()) return 'exists';

  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD || !env.ADMIN_NAME) {
    console.warn(
      '⚠️  Chưa có tài khoản Admin và thiếu ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME trong .env → không tạo Admin mặc định',
    );
    return 'skipped';
  }

  try {
    const email = emailSchema.parse(env.ADMIN_EMAIL);
    const fullName = fullNameSchema.parse(env.ADMIN_NAME);
    const password = passwordSchema.parse(env.ADMIN_PASSWORD);

    if (await userRepository.existsByEmail(email)) {
      console.warn(`⚠️  Email ${email} đã thuộc một tài khoản khác → không tạo Admin mặc định`);
      return 'skipped';
    }

    await userRepository.create({
      fullName,
      email,
      phone: null,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
    });
    console.log(`👤 Đã tạo tài khoản Admin mặc định: ${email}`);
    return 'created';
  } catch (err) {
    if (err instanceof ZodError) {
      const reasons = err.issues.map((issue) => issue.message).join(', ');
      console.warn(`⚠️  Cấu hình Admin mặc định không hợp lệ (${reasons}) → không tạo`);
      return 'skipped';
    }
    throw err;
  }
}
