import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt';
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
 * - không có header      → error = null (chưa đăng nhập)
 * - token sai / hết hạn  → error 401 → client gọi /auth/refresh
 *
 * Khung chỉ tin dữ liệu trong token. Module Auth bổ sung: tải lại user từ DB mỗi request
 * (tài khoản bị khoá, token cấp trước lần đổi mật khẩu, role mới nhất).
 */
async function checkAuth(req: Request): Promise<AuthCheck> {
  const token = readBearerToken(req);
  if (!token) return { ok: false, error: null };

  const payload = verifyAccessToken(token);
  if (!payload) return { ok: false, error: AppError.unauthorized('Phiên đăng nhập đã hết hạn') };

  return { ok: true, user: { id: payload.sub, role: payload.role } };
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
