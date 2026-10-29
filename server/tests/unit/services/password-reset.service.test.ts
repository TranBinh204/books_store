import { createHash } from 'node:crypto';
import { env } from '../../../src/config/env';
import * as mailer from '../../../src/lib/mailer';
import * as passwordResetRepository from '../../../src/repositories/password-reset.repository';
import * as userRepository from '../../../src/repositories/user.repository';
import * as passwordResetService from '../../../src/services/password-reset.service';
import * as sessionService from '../../../src/services/session.service';
import type { User } from '../../../src/types/user.types';

jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/repositories/password-reset.repository');
jest.mock('../../../src/lib/mailer');
jest.mock('../../../src/services/session.service');
// Không mở transaction thật — chạy callback với client giả
jest.mock('../../../src/db/transaction', () => ({
  withTransaction: (callback: (client: object) => unknown) => callback({}),
}));

const userRepo = jest.mocked(userRepository);
const resetRepo = jest.mocked(passwordResetRepository);
const sendMail = jest.mocked(mailer.sendMail);

const user: User = {
  id: 7,
  fullName: 'Nguyễn Văn A',
  email: 'a@gmail.com',
  phone: '0912345678',
  passwordHash: 'hash',
  role: 'CUSTOMER',
  avatarUrl: null,
  birthday: null,
  gender: null,
  isActive: true,
  passwordChangedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

beforeEach(() => {
  sendMail.mockResolvedValue(undefined);
});

describe('passwordResetService.requestPasswordReset', () => {
  it('email không tồn tại: không tạo token, không gửi mail, không báo lỗi', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    await expect(passwordResetService.requestPasswordReset('x@gmail.com')).resolves.toBeUndefined();
    expect(resetRepo.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('tài khoản bị khoá: không tạo token, không gửi mail', async () => {
    userRepo.findByEmail.mockResolvedValue({ ...user, isActive: false });
    await passwordResetService.requestPasswordReset(user.email);
    expect(resetRepo.create).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('vô hiệu token cũ, chỉ lưu BẢN BĂM của token, gửi link chứa token gốc', async () => {
    userRepo.findByEmail.mockResolvedValue(user);

    await passwordResetService.requestPasswordReset(user.email);

    expect(resetRepo.invalidateUnusedByUser).toHaveBeenCalledWith(user.id, expect.anything());
    const [userId, savedHash, expiresAt] = resetRepo.create.mock.calls[0];
    expect(userId).toBe(user.id);

    // Hết hạn sau PASSWORD_RESET_TTL_MINUTES (cấu hình trong .env)
    const minutes = (expiresAt.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(env.PASSWORD_RESET_TTL_MINUTES - 1);
    expect(minutes).toBeLessThanOrEqual(env.PASSWORD_RESET_TTL_MINUTES);

    // Token gốc trong email → băm ra đúng giá trị đã lưu
    const mail = sendMail.mock.calls[0][0];
    const token = mail.text.match(/token=([a-f0-9]{64})/)?.[1];
    expect(token).toBeDefined();
    expect(savedHash).toBe(sha256(token!));
    expect(savedHash).not.toBe(token);
    expect(mail.to).toBe(user.email);
  });
});

describe('passwordResetService.resetPassword', () => {
  const token = 'a'.repeat(64);

  it('token không hợp lệ → INVALID_RESET_TOKEN, không đổi mật khẩu', async () => {
    resetRepo.findValidByHash.mockResolvedValue(null);
    await expect(
      passwordResetService.resetPassword({ token, newPassword: 'matkhaumoi1' }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_RESET_TOKEN' });
    expect(userRepo.updatePassword).not.toHaveBeenCalled();
  });

  it('token hợp lệ → đổi mật khẩu (đã băm), vô hiệu token, đăng xuất mọi thiết bị', async () => {
    resetRepo.findValidByHash.mockResolvedValue({
      id: 1,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60000),
      usedAt: null,
    });

    await passwordResetService.resetPassword({ token, newPassword: 'matkhaumoi1' });

    expect(resetRepo.findValidByHash).toHaveBeenCalledWith(sha256(token), expect.anything(), true);
    const [userId, newHash] = userRepo.updatePassword.mock.calls[0];
    expect(userId).toBe(user.id);
    expect(newHash).not.toBe('matkhaumoi1');
    expect(resetRepo.invalidateUnusedByUser).toHaveBeenCalledWith(user.id, expect.anything());
    expect(jest.mocked(sessionService).revokeAllSessions).toHaveBeenCalledWith(
      user.id,
      expect.anything(),
    );
  });
});
