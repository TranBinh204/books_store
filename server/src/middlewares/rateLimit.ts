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


// Mỗi module tạo limiter riêng khi cần, vd:
// export const loginLimiter = createLimiter({ windowMinutes: 15, max: 5, onlyCountFailures: true });
