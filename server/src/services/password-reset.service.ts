import { env } from '../config/env';
import { withTransaction } from '../db/transaction';
import { resetPasswordEmail } from '../lib/email-templates/reset-password';
import { sendMail } from '../lib/mailer';
import * as passwordResetRepository from '../repositories/password-reset.repository';
import * as userRepository from '../repositories/user.repository';
import type { ResetPasswordInput } from '../schemas/auth.schema';
import { AppError } from '../utils/AppError';
import { hashPassword } from '../utils/password';
import { generateToken, hashToken } from '../utils/token';
import * as sessionService from './session.service';

export const FORGOT_PASSWORD_MESSAGE =
  'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu';

function invalidTokenError() {
  return new AppError(
    400,
    'INVALID_RESET_TOKEN',
    'Đường dẫn đặt lại mật khẩu đã hết hạn hoặc không hợp lệ',
  );
}

/**
 * Tạo yêu cầu đặt lại mật khẩu. Luôn kết thúc bình thường dù email có tồn tại hay không
 * (controller luôn trả cùng một thông báo → không dò được email).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await userRepository.findByEmail(email);
  if (!user || !user.isActive) return;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  await withTransaction(async (client) => {
    await passwordResetRepository.invalidateUnusedByUser(user.id, client);
    await passwordResetRepository.create(user.id, hashToken(token), expiresAt, client);
  });

  const resetUrl = `${env.CLIENT_URL}/dat-lai-mat-khau?token=${token}`;

  // Không chờ gửi mail xong mới trả lời → thời gian phản hồi như nhau dù email có tồn tại hay không
  sendMail(
    resetPasswordEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
      expiresInMinutes: env.PASSWORD_RESET_TTL_MINUTES,
    }),
  ).catch((err) => console.error('Gửi email đặt lại mật khẩu thất bại:', err));
}

export async function verifyResetToken(token: string): Promise<void> {
  const reset = await passwordResetRepository.findValidByHash(hashToken(token));
  if (!reset) throw invalidTokenError();
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const passwordHash = await hashPassword(input.newPassword);

  await withTransaction(async (client) => {
    // Khoá dòng token → 2 request cùng lúc không thể dùng 1 token hai lần
    const reset = await passwordResetRepository.findValidByHash(
      hashToken(input.token),
      client,
      true,
    );
    if (!reset) throw invalidTokenError();

    // Cập nhật password_changed_at → mọi access token (JWT) cấp trước đó bị vô hiệu
    await userRepository.updatePassword(reset.userId, passwordHash, client);
    await passwordResetRepository.invalidateUnusedByUser(reset.userId, client);
    // Đăng xuất mọi thiết bị: huỷ toàn bộ refresh token
    await sessionService.revokeAllSessions(reset.userId, client);
  });
}
