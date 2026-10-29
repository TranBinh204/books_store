import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env';
import type { ApiError } from '../types/api.types';

export interface LimiterOptions {
  windowMinutes: number;
  max: number;
  /** true → chỉ đếm request thất bại (status ≥ 400), vd đăng nhập sai */
  onlyCountFailures?: boolean;
  /** Mặc định: bật theo RATE_LIMIT_ENABLED, luôn tắt khi chạy test */
  enabled?: boolean;
  /** true → đếm theo tài khoản đăng nhập (route sau requireAuth) thay vì theo IP */
  keyByUser?: boolean;
}

const tooManyRequests: ApiError = {
  success: false,
  error: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau ít phút',
  },
};

/** Tạo bộ giới hạn số request theo IP (hoặc theo tài khoản). Mọi con số cấu hình trong .env */
export function createLimiter({
  windowMinutes,
  max,
  onlyCountFailures = false,
  enabled = env.RATE_LIMIT_ENABLED && !env.isTest,
  keyByUser = false,
}: LimiterOptions) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit: max,
    skipSuccessfulRequests: onlyCountFailures,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => !enabled,
    ...(keyByUser && {
      keyGenerator: (req) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip ?? '')),
    }),
    handler: (_req, res) => res.status(429).json(tooManyRequests),
  });
}



// -------- Auth limiters (M01) --------
// Đăng nhập: chỉ đếm lần SAI — đăng nhập đúng không bị tính
export const loginLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_LOGIN_WINDOW_MINUTES,
  max: env.RATE_LIMIT_LOGIN_MAX,
  onlyCountFailures: true,
});

export const registerLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_REGISTER_WINDOW_MINUTES,
  max: env.RATE_LIMIT_REGISTER_MAX,
});

// Nhập mã OTP đăng ký: chỉ đếm lần SAI (mỗi mã đã có giới hạn số lần sai riêng)
export const registerVerifyLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_REGISTER_VERIFY_WINDOW_MINUTES,
  max: env.RATE_LIMIT_REGISTER_VERIFY_MAX,
  onlyCountFailures: true,
});

export const registerResendLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_REGISTER_RESEND_WINDOW_MINUTES,
  max: env.RATE_LIMIT_REGISTER_RESEND_MAX,
});

export const forgotPasswordLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MINUTES,
  max: env.RATE_LIMIT_FORGOT_PASSWORD_MAX,
});

export const resetPasswordLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_RESET_PASSWORD_WINDOW_MINUTES,
  max: env.RATE_LIMIT_RESET_PASSWORD_MAX,
});

// Đổi mật khẩu: chỉ đếm lần nhập SAI mật khẩu hiện tại (chống dò mật khẩu khi máy bị bỏ quên)
export const changePasswordLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_CHANGE_PASSWORD_WINDOW_MINUTES,
  max: env.RATE_LIMIT_CHANGE_PASSWORD_MAX,
  onlyCountFailures: true,
});

export const refreshLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_REFRESH_WINDOW_MINUTES,
  max: env.RATE_LIMIT_REFRESH_MAX,
});
