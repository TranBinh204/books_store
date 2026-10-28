import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../types/express';

export interface AccessTokenPayload {
  sub: number;
  role: UserRole;
  /** Thời điểm cấp (giây) — do jsonwebtoken tự thêm */
  iat: number;
  exp: number;
}

/** Access token: JWT sống ngắn (mặc định 15 phút) */
export function signAccessToken(userId: number, role: UserRole): string {
  return jwt.sign({ role }, env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
    algorithm: 'HS256',
  });
}

/** Trả về payload nếu token hợp lệ, `null` nếu sai / hết hạn */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub || !decoded.iat || !decoded.exp) return null;
    const sub = Number(decoded.sub);
    if (!Number.isInteger(sub)) return null;
    return { sub, role: decoded.role as UserRole, iat: decoded.iat, exp: decoded.exp };
  } catch {
    return null;
  }
}
