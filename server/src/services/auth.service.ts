import * as userRepository from '../repositories/user.repository';
import type { LoginInput } from '../schemas/auth.schema';
import { toPublicUser, type PublicUser } from '../types/user.types';
import { AppError } from '../utils/AppError';
import { verifyPassword } from '../utils/password';
import * as sessionService from './session.service';
import type { Session, SessionMeta } from './session.service';

// Đăng ký (xác minh email bằng OTP): xem registration.service.ts

export async function login(input: LoginInput, meta: SessionMeta): Promise<Session> {
  const user = await userRepository.findByEmail(input.email);

  // Không tiết lộ email có tồn tại hay không
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
  }
  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khoá, vui lòng liên hệ cửa hàng');
  }

  const { refreshTokenId: _id, ...tokens } = await sessionService.createSession(user, meta);
  return { user: toPublicUser(user), tokens };
}

export async function getCurrentUser(userId: number): Promise<PublicUser> {
  const user = await userRepository.findById(userId);
  if (!user) throw AppError.unauthorized();
  return toPublicUser(user);
}
