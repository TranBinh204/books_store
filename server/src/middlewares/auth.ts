import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import * as userRepository from '../repositories/user.repository';
import type { UserRole } from '../types/express';
import { AppError } from '../utils/AppError';

type AuthCheck =
  { ok: true; user: { id: number; role: UserRole } } | { ok: false; error: AppError | null };

/** Lấy access token từ header `Authorization: Bearer <token>` */
function readBearerToken(req: Request): string | null {
  const header = req.get('authorization');
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/**
 * Kiểm tra access token:
 * - không có header                  → error = null (chưa đăng nhập)
 * - token sai / hết hạn / bị vô hiệu → error 401 → client gọi /auth/refresh
 * - tài khoản bị khoá                → error 403 ACCOUNT_LOCKED
 */
async function checkAuth(req: Request): Promise<AuthCheck> {
  const token = readBearerToken(req);
  if (!token) return { ok: false, error: null };

  const payload = verifyAccessToken(token);
  if (!payload) return { ok: false, error: AppError.unauthorized('Phiên đăng nhập đã hết hạn') };

  // Tải lại user mỗi request → khoá tài khoản / đổi mật khẩu có hiệu lực ngay
  const user = await userRepository.findById(payload.sub);
  if (!user) return { ok: false, error: AppError.unauthorized() };

  // Token cấp trước lần đổi mật khẩu gần nhất → không còn hiệu lực
  if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
    return { ok: false, error: AppError.unauthorized('Phiên đăng nhập đã hết hạn') };
  }

  if (!user.isActive) {
    return {
      ok: false,
      error: new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khoá, vui lòng liên hệ cửa hàng'),
    };
  }

  // Dùng role trong DB (không tin role trong token nếu admin đã đổi quyền)
  return { ok: true, user: { id: user.id, role: user.role } };
}

/** Bắt buộc đăng nhập */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const result = await checkAuth(req);
  if (result.ok) {
    req.user = result.user;
    return next();
  }
  next(result.error ?? AppError.unauthorized());
}

/** Có đăng nhập thì gắn req.user, không thì bỏ qua (API công khai) */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const result = await checkAuth(req);
  if (result.ok) req.user = result.user;
  next();
}

/** Dùng SAU requireAuth */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
}
