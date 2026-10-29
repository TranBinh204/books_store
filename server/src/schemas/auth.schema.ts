import { z } from 'zod';
import { emailSchema, fullNameSchema, passwordSchema, phoneSchema } from './common.schema';

export const registerSchema = z.object({
  fullName: fullNameSchema,
  phone: phoneSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const verifyRegisterSchema = z.object({
  email: emailSchema,
  otp: z
    .string({ error: 'Vui lòng nhập mã xác minh' })
    .trim()
    .regex(/^\d{6}$/, 'Mã xác minh gồm 6 chữ số'),
});

export const resendRegisterOtpSchema = z.object({
  email: emailSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  // Không kiểm tra độ mạnh khi đăng nhập — chỉ cần có giá trị
  password: z.string({ error: 'Vui lòng nhập mật khẩu' }).min(1, 'Vui lòng nhập mật khẩu').max(72),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const tokenSchema = z
  .string({ error: 'Thiếu mã đặt lại mật khẩu' })
  .regex(/^[a-f0-9]{64}$/, 'Mã đặt lại mật khẩu không hợp lệ');

export const verifyResetTokenSchema = z.object({
  token: tokenSchema,
});

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  newPassword: passwordSchema,
});

const refreshTokenValue = z
  .string({ error: 'Thiếu refresh token' })
  .regex(/^[a-f0-9]{64}$/, 'Refresh token không hợp lệ');

export const refreshTokenSchema = z.object({
  refreshToken: refreshTokenValue,
});

export const logoutSchema = z.object({
  refreshToken: refreshTokenValue.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyRegisterInput = z.infer<typeof verifyRegisterSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
