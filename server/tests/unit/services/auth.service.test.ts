import bcrypt from 'bcrypt';
import * as userRepository from '../../../src/repositories/user.repository';
import * as authService from '../../../src/services/auth.service';
import * as sessionService from '../../../src/services/session.service';
import type { User } from '../../../src/types/user.types';
import { AppError } from '../../../src/utils/AppError';

jest.mock('../../../src/repositories/user.repository');
jest.mock('../../../src/services/session.service');
const repo = jest.mocked(userRepository);
const session = jest.mocked(sessionService);

const meta = { userAgent: 'jest', ip: '127.0.0.1' };

beforeEach(() => {
  session.createSession.mockResolvedValue({
    accessToken: 'access',
    refreshToken: 'refresh',
    refreshTokenId: 1,
  });
});

const input = {
  fullName: 'Nguyễn Văn A',
  phone: '0912345678',
  email: 'a@gmail.com',
  password: 'matkhau123',
};

async function makeUser(overrides: Partial<User> = {}): Promise<User> {
  return {
    id: 1,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    passwordHash: await bcrypt.hash(input.password, 4),
    role: 'CUSTOMER',
    avatarUrl: null,
    birthday: null,
    gender: null,
    isActive: true,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function expectAppError(promise: Promise<unknown>, status: number, code: string) {
  await expect(promise).rejects.toBeInstanceOf(AppError);
  await expect(promise).rejects.toMatchObject({ statusCode: status, code });
}

describe('authService.login', () => {
  it('báo INVALID_CREDENTIALS khi email không tồn tại', async () => {
    repo.findByEmail.mockResolvedValue(null);
    await expectAppError(authService.login(input, meta), 401, 'INVALID_CREDENTIALS');
  });

  it('báo INVALID_CREDENTIALS khi sai mật khẩu', async () => {
    repo.findByEmail.mockResolvedValue(await makeUser());
    await expectAppError(
      authService.login({ email: input.email, password: 'saimatkhau1' }, meta),
      401,
      'INVALID_CREDENTIALS',
    );
  });

  it('báo ACCOUNT_LOCKED khi tài khoản bị khoá, không tạo phiên', async () => {
    repo.findByEmail.mockResolvedValue(await makeUser({ isActive: false }));
    await expectAppError(authService.login(input, meta), 403, 'ACCOUNT_LOCKED');
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it('đăng nhập thành công trả về user + cặp token', async () => {
    repo.findByEmail.mockResolvedValue(await makeUser({ role: 'ADMIN' }));
    const result = await authService.login(input, meta);
    expect(result.user).toMatchObject({ id: 1, email: input.email, role: 'ADMIN' });
    expect(result.tokens).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    expect(session.createSession).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), meta);
  });
});
