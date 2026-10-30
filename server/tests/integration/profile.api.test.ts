import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import {
  bearer,
  createCustomer,
  getTokens,
  validRegisterBody,
  type TestTokens,
} from '../helpers/auth';
import { resetDatabase } from '../helpers/db';
import { createBook } from '../helpers/shop';

// M04 – Thông tin cá nhân, đổi mật khẩu, thiết bị đăng nhập (docs/03-modules/04-user-profile.md)

beforeEach(async () => {
  await resetDatabase();
  await createCustomer();
});

afterAll(async () => {
  await pool.end();
});

const { email, password } = validRegisterBody;

/** Đăng nhập 1 phiên mới (mỗi lần gọi = 1 thiết bị) */
async function login(userAgent = 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36') {
  const res = await request(app)
    .post('/api/auth/login')
    .set('User-Agent', userAgent)
    .send({ email, password });
  expect(res.status).toBe(200);
  return getTokens(res);
}

const me = (tokens: TestTokens) => ({
  get: (url = '') =>
    request(app)
      .get(`/api/me${url}`)
      .set('Authorization', bearer(tokens.accessToken))
      .set('X-Refresh-Token', tokens.refreshToken),
  patch: (body: object) =>
    request(app).patch('/api/me').set('Authorization', bearer(tokens.accessToken)).send(body),
  post: (url: string, body: object = {}) =>
    request(app)
      .post(`/api/me${url}`)
      .set('Authorization', bearer(tokens.accessToken))
      .set('X-Refresh-Token', tokens.refreshToken)
      .send(body),
  delete: (url: string) =>
    request(app).delete(`/api/me${url}`).set('Authorization', bearer(tokens.accessToken)),
});

const refresh = (tokens: TestTokens) =>
  request(app).post('/api/auth/refresh').send({ refreshToken: tokens.refreshToken });

describe('Phân quyền', () => {
  it('chưa đăng nhập → 401 ở mọi API /api/me', async () => {
    for (const url of ['/api/me', '/api/me/sessions', '/api/me/addresses']) {
      expect((await request(app).get(url)).status).toBe(401);
    }
    expect((await request(app).patch('/api/me').send({ fullName: 'X' })).status).toBe(401);
  });
});

describe('Thông tin cá nhân', () => {
  it('số liệu nhanh: 0 đơn / 0 yêu thích khi mới tạo; đếm đúng sau khi thêm sách yêu thích', async () => {
    const tokens = await login();
    const empty = await me(tokens).get('/overview');
    expect(empty.status).toBe(200);
    expect(empty.body.data).toEqual({ orderCount: 0, wishlistCount: 0 });

    const bookId = await createBook();
    await pool.query(
      `INSERT INTO wishlists (user_id, book_id) SELECT id, $1 FROM users WHERE email = $2`,
      [bookId, email],
    );
    const after = await me(tokens).get('/overview');
    expect(after.body.data).toEqual({ orderCount: 0, wishlistCount: 1 });
  });

  it('xem hồ sơ: đủ trường, không lộ mật khẩu', async () => {
    const res = await me(await login()).get();
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      fullName: validRegisterBody.fullName,
      email,
      phone: validRegisterBody.phone,
      role: 'CUSTOMER',
      birthday: null,
      gender: null,
    });
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });

  it('sửa họ tên, SĐT, ngày sinh, giới tính; xoá ngày sinh bằng null; không sửa được email / vai trò', async () => {
    const api = me(await login());
    const res = await api.patch({
      fullName: '  Trần   Thị B ',
      phone: '0987654321',
      birthday: '2000-05-20',
      gender: 'FEMALE',
      email: 'hack@gmail.com',
      role: 'ADMIN',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      fullName: 'Trần Thị B',
      phone: '0987654321',
      birthday: '2000-05-20',
      gender: 'FEMALE',
      email,
      role: 'CUSTOMER',
    });

    expect((await api.patch({ birthday: null })).body.data).toMatchObject({
      birthday: null,
      gender: 'FEMALE',
    });
  });

  it('SĐT trùng tài khoản khác → 409 PHONE_EXISTS; giữ SĐT của chính mình thì được', async () => {
    await createCustomer({ ...validRegisterBody, email: 'b@gmail.com', phone: '0911111111' });
    const api = me(await login());

    const dup = await api.patch({ phone: '0911111111' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('PHONE_EXISTS');
    expect((await api.patch({ phone: validRegisterBody.phone })).status).toBe(200);
  });

  it('dữ liệu sai → 422: ngày sinh tương lai / quá xa, SĐT sai, giới tính lạ, body rỗng', async () => {
    const api = me(await login());
    for (const body of [
      { birthday: '2999-01-01' },
      { birthday: '1800-01-01' },
      { birthday: '2000-02-30' },
      { phone: '12345' },
      { gender: 'X' },
      {},
    ]) {
      const res = await api.patch(body);
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('Đổi mật khẩu', () => {
  it('sai mật khẩu hiện tại → 400 WRONG_PASSWORD; trùng mật khẩu cũ → 400 SAME_PASSWORD; mật khẩu yếu → 422', async () => {
    const api = me(await login());
    const wrong = await api.post('/change-password', {
      currentPassword: 'sai12345',
      newPassword: 'moi123456',
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('WRONG_PASSWORD');

    const same = await api.post('/change-password', {
      currentPassword: password,
      newPassword: password,
    });
    expect(same.status).toBe(400);
    expect(same.body.error.code).toBe('SAME_PASSWORD');

    expect(
      (await api.post('/change-password', { currentPassword: password, newPassword: '123' }))
        .status,
    ).toBe(422);
  });

  it('thành công: thiết bị đang dùng nhận token mới & vẫn đăng nhập; thiết bị khác bị đăng xuất; đăng nhập bằng mật khẩu mới', async () => {
    const thisDevice = await login();
    const otherDevice = await login('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile Safari/604.1');
    // Token cũ cấp ở giây trước → chắc chắn bị vô hiệu bởi password_changed_at
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res = await me(thisDevice).post('/change-password', {
      currentPassword: password,
      newPassword: 'matkhaumoi456',
    });
    expect(res.status).toBe(200);
    const newTokens = res.body.data.tokens as TestTokens;

    expect((await me(newTokens).get()).status).toBe(200);
    expect((await refresh(newTokens)).status).toBe(200);

    expect((await refresh(otherDevice)).status).toBe(401);
    expect((await refresh(thisDevice)).status).toBe(401);
    expect((await me(otherDevice).get()).status).toBe(401);

    expect((await request(app).post('/api/auth/login').send({ email, password })).status).toBe(401);
    expect(
      (await request(app).post('/api/auth/login').send({ email, password: 'matkhaumoi456' }))
        .status,
    ).toBe(200);
  });
});

describe('Thiết bị đăng nhập', () => {
  it('liệt kê phiên còn hiệu lực, đánh dấu & đưa "thiết bị này" lên đầu, rút gọn trình duyệt / hệ điều hành', async () => {
    const pc = await login('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36');
    const phone = await login(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1',
    );
    const loggedOut = await login();
    await request(app).post('/api/auth/logout').send({ refreshToken: loggedOut.refreshToken });

    const res = await me(phone).get('/sessions');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      isCurrent: true,
      browser: 'Safari',
      os: 'iOS',
      deviceType: 'MOBILE',
    });
    expect(res.body.data[1]).toMatchObject({
      isCurrent: false,
      browser: 'Chrome',
      os: 'Windows',
      deviceType: 'DESKTOP',
    });
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ['browser', 'deviceType', 'id', 'ip', 'isCurrent', 'lastActiveAt', 'os'].sort(),
    );
    expect((await me(pc).get('/sessions')).body.data[0].isCurrent).toBe(true);
  });

  it('đăng xuất 1 thiết bị → phiên đó hết hiệu lực; phiên đã huỷ / của người khác → 404', async () => {
    const pc = await login();
    const phone = await login();
    const sessions = (await me(pc).get('/sessions')).body.data as {
      id: number;
      isCurrent: boolean;
    }[];
    const phoneSession = sessions.find((session) => !session.isCurrent)!;

    expect((await me(pc).delete(`/sessions/${phoneSession.id}`)).status).toBe(204);
    expect((await refresh(phone)).status).toBe(401);
    expect((await refresh(pc)).status).toBe(200);
    expect((await me(pc).delete(`/sessions/${phoneSession.id}`)).status).toBe(404);

    // Phiên của tài khoản khác
    await createCustomer({ ...validRegisterBody, email: 'b@gmail.com', phone: '0911111111' });
    const other = getTokens(
      await request(app).post('/api/auth/login').send({ email: 'b@gmail.com', password }),
    );
    const otherSessionId = (await me(other).get('/sessions')).body.data[0].id;
    expect((await me(pc).delete(`/sessions/${otherSessionId}`)).status).toBe(404);
    expect((await refresh(other)).status).toBe(200);
  });

  it('đăng xuất tất cả thiết bị khác → giữ thiết bị này', async () => {
    const pc = await login();
    const phone = await login();
    const tablet = await login();

    const res = await me(pc).post('/sessions/revoke-others');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ revoked: 2 });
    expect((await refresh(phone)).status).toBe(401);
    expect((await refresh(tablet)).status).toBe(401);
    expect((await refresh(pc)).status).toBe(200);
  });
});
