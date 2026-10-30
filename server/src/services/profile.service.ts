import { withTransaction } from '../db/transaction';
import * as orderRepository from '../repositories/order.repository';
import * as refreshTokenRepository from '../repositories/refresh-token.repository';
import * as userRepository from '../repositories/user.repository';
import * as wishlistRepository from '../repositories/wishlist.repository';
import type { ChangePasswordInput, UpdateProfileInput } from '../schemas/profile.schema';
import { toProfile, type Profile, type User } from '../types/user.types';
import { AppError } from '../utils/AppError';
import { isUniqueViolation } from '../utils/dbError';
import { hashPassword, verifyPassword } from '../utils/password';
import { createSession, type AuthTokens, type SessionMeta } from './session.service';

// Thông tin cá nhân & đổi mật khẩu (F08) — docs/03-modules/04-user-profile.md

function phoneExistsError() {
  return new AppError(409, 'PHONE_EXISTS', 'Số điện thoại đã được sử dụng', [
    { field: 'phone', message: 'Số điện thoại đã được sử dụng' },
  ]);
}

async function getUser(userId: number): Promise<User> {
  const user = await userRepository.findById(userId);
  if (!user) throw AppError.unauthorized();
  return user;
}

export async function getProfile(userId: number): Promise<Profile> {
  return toProfile(await getUser(userId));
}

/** Chỉ sửa trường được gửi lên; email & vai trò không sửa được */
export async function updateProfile(userId: number, input: UpdateProfileInput): Promise<Profile> {
  const current = await getUser(userId);
  const next = {
    fullName: input.fullName ?? current.fullName,
    phone: input.phone ?? current.phone,
    birthday: input.birthday === undefined ? current.birthday : input.birthday,
    gender: input.gender === undefined ? current.gender : input.gender,
  };

  if (next.phone && next.phone !== current.phone) {
    if (await userRepository.existsByPhone(next.phone, userId)) throw phoneExistsError();
  }
  try {
    await userRepository.updateProfile(userId, next);
  } catch (err) {
    // Tài khoản khác vừa dùng SĐT này đúng lúc lưu
    if (isUniqueViolation(err, 'users_phone_key')) throw phoneExistsError();
    throw err;
  }
  return getProfile(userId);
}

/**
 * Đổi mật khẩu: kiểm tra mật khẩu hiện tại → lưu mật khẩu mới → huỷ MỌI phiên cũ
 * → cấp phiên mới cho thiết bị đang dùng (không phải đăng nhập lại). Thiết bị khác bị đăng xuất.
 */
export async function changePassword(
  userId: number,
  input: ChangePasswordInput,
  meta: SessionMeta,
): Promise<{ tokens: AuthTokens }> {
  const user = await getUser(userId);
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new AppError(400, 'WRONG_PASSWORD', 'Mật khẩu hiện tại không đúng', [
      { field: 'currentPassword', message: 'Mật khẩu hiện tại không đúng' },
    ]);
  }
  if (await verifyPassword(input.newPassword, user.passwordHash)) {
    throw new AppError(400, 'SAME_PASSWORD', 'Mật khẩu mới phải khác mật khẩu hiện tại', [
      { field: 'newPassword', message: 'Mật khẩu mới phải khác mật khẩu hiện tại' },
    ]);
  }

  const passwordHash = await hashPassword(input.newPassword);
  const tokens = await withTransaction(async (client) => {
    // password_changed_at = now() → mọi access token cấp trước đó hết hiệu lực
    await userRepository.updatePassword(userId, passwordHash, client);
    await refreshTokenRepository.revokeAllByUser(userId, client);
    const { refreshTokenId: _id, ...newTokens } = await createSession(user, meta, client);
    return newTokens;
  });
  return { tokens };
}

/** Số liệu nhanh cho thẻ danh tính ở trang tài khoản: tổng số đơn (mọi trạng thái) và số sách yêu thích */
export async function getOverview(
  userId: number,
): Promise<{ orderCount: number; wishlistCount: number }> {
  const [byStatus, wishlistCount] = await Promise.all([
    orderRepository.countByStatus(userId),
    wishlistRepository.countByUser(userId),
  ]);
  const orderCount = Object.values(byStatus).reduce((sum, count) => sum + (count ?? 0), 0);
  return { orderCount, wishlistCount };
}
