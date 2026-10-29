import { env } from '../../../src/config/env';
import * as userRepository from '../../../src/repositories/user.repository';
import { seedDefaultAdmin } from '../../../src/seeds/admin.seed';

jest.mock('../../../src/repositories/user.repository');
const repo = jest.mocked(userRepository);

const original = {
  email: env.ADMIN_EMAIL,
  password: env.ADMIN_PASSWORD,
  name: env.ADMIN_NAME,
};

function setAdminEnv(email?: string, password?: string, name?: string) {
  env.ADMIN_EMAIL = email;
  env.ADMIN_PASSWORD = password;
  env.ADMIN_NAME = name;
}

beforeEach(() => {
  setAdminEnv('Admin@BookStore.vn', 'admin12345', 'Quản trị viên');
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterAll(() => {
  setAdminEnv(original.email, original.password, original.name);
});

describe('seedDefaultAdmin', () => {
  it('đã có Admin → bỏ qua, không tạo thêm', async () => {
    repo.existsAdmin.mockResolvedValue(true);
    await expect(seedDefaultAdmin()).resolves.toBe('exists');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('chưa có Admin → tạo từ .env (email chữ thường, mật khẩu đã băm, role ADMIN)', async () => {
    repo.existsAdmin.mockResolvedValue(false);
    repo.existsByEmail.mockResolvedValue(false);

    await expect(seedDefaultAdmin()).resolves.toBe('created');

    const input = repo.create.mock.calls[0][0];
    expect(input).toMatchObject({
      email: 'admin@bookstore.vn',
      fullName: 'Quản trị viên',
      role: 'ADMIN',
      phone: null,
    });
    expect(input.passwordHash).not.toBe('admin12345');
  });

  it('thiếu cấu hình trong .env → bỏ qua', async () => {
    repo.existsAdmin.mockResolvedValue(false);
    setAdminEnv(undefined, undefined, undefined);
    await expect(seedDefaultAdmin()).resolves.toBe('skipped');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('mật khẩu không đạt quy tắc → bỏ qua', async () => {
    repo.existsAdmin.mockResolvedValue(false);
    setAdminEnv('admin@bookstore.vn', 'yeu', 'Quản trị viên');
    await expect(seedDefaultAdmin()).resolves.toBe('skipped');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('email đã thuộc tài khoản khác → bỏ qua', async () => {
    repo.existsAdmin.mockResolvedValue(false);
    repo.existsByEmail.mockResolvedValue(true);
    await expect(seedDefaultAdmin()).resolves.toBe('skipped');
    expect(repo.create).not.toHaveBeenCalled();
  });
});
