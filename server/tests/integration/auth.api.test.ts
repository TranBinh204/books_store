import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../../src/app';
import { env } from '../../src/config/env';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { hashPassword } from '../../src/utils/password';
import { bearer, createCustomer, getTokens, validRegisterBody } from '../helpers/auth';
import { resetDatabase } from '../helpers/db';

jest.mock('../../src/lib/mailer');
const sendMail = jest.mocked(mailer.sendMail);

beforeEach(async () => {
  await resetDatabase();
  sendMail.mockResolvedValue(undefined);
});

afterAll(async () => {
  await pool.end();
});

function register(body = validRegisterBody) {
  return request(app).post('/api/auth/register').send(body);
}

function verifyRegister(otp: string, email = 'a@gmail.com') {
  return request(app).post('/api/auth/register/verify').send({ email, otp });
}

function resendOtp(email = 'a@gmail.com') {
  return request(app).post('/api/auth/register/resend').send({ email });
}

/** Mã OTP trong email đăng ký gửi gần nhất */
function lastOtp(): string {
  const otp = sendMail.mock.calls.at(-1)?.[0].text.match(/^(\d{6})$/m)?.[1];
  if (!otp) throw new Error('Không tìm thấy mã OTP trong email');
  return otp;
}

/** Mã sai chắc chắn khác mã đúng */
function wrongOtp(otp: string) {
  return otp === '000000' ? '111111' : '000000';
}

/** Lùi giờ gửi mã về quá khứ → hết thời gian chờ gửi lại */
async function skipResendCooldown() {
  await pool.query(
    `UPDATE pending_registrations SET last_sent_at = last_sent_at - make_interval(secs => $1)`,
    [env.REGISTER_OTP_RESEND_COOLDOWN_SECONDS + 1],
  );
}

function login(email = 'a@gmail.com', password = 'matkhau123') {
  return request(app).post('/api/auth/login').send({ email, password });
}

function refresh(refreshToken: string) {
  return request(app).post('/api/auth/refresh').send({ refreshToken });
}

function me(accessToken: string) {
  return request(app).get('/api/auth/me').set('Authorization', bearer(accessToken));
}

/** Đưa thời điểm huỷ của mọi refresh token về quá khứ (vượt thời gian ân hạn) */
async function expireGracePeriod() {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = revoked_at - make_interval(secs => $1)
     WHERE revoked_at IS NOT NULL`,
    [env.REFRESH_REUSE_GRACE_SECONDS + 5],
  );
}

/** Lấy token gốc từ email đặt lại mật khẩu đã "gửi" */
async function requestResetToken(email: string) {
  await request(app).post('/api/auth/forgot-password').send({ email }).expect(200);
  // requestPasswordReset không chờ gửi mail → đợi vòng lặp sự kiện kế tiếp
  await new Promise((resolve) => setImmediate(resolve));
  const mail = sendMail.mock.calls.at(-1)?.[0];
  const token = mail?.text.match(/token=([a-f0-9]{64})/)?.[1];
  if (!token) throw new Error('Không tìm thấy token trong email');
  return token;
}

describe('POST /api/auth/register (bước 1: gửi OTP)', () => {
  it('gửi mã 6 số qua email, CHƯA tạo tài khoản', async () => {
    const res = await register();

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      email: 'a@gmail.com',
      expiresInMinutes: env.REGISTER_OTP_TTL_MINUTES,
      resendAfterSeconds: env.REGISTER_OTP_RESEND_COOLDOWN_SECONDS,
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].to).toBe('a@gmail.com');
    expect(lastOtp()).toMatch(/^\d{6}$/);

    expect((await pool.query('SELECT 1 FROM users')).rowCount).toBe(0);
    // Chưa xác minh → chưa đăng nhập được
    expect((await login()).status).toBe(401);
  });

  it('chỉ lưu bản băm của mật khẩu và mã OTP', async () => {
    await register();
    const otp = lastOtp();
    const { rows } = await pool.query('SELECT password_hash, otp_hash FROM pending_registrations');
    expect(rows[0].password_hash).not.toBe(validRegisterBody.password);
    expect(rows[0].otp_hash).not.toBe(otp);
  });

  it('chuẩn hoá email về chữ thường', async () => {
    const res = await register({ ...validRegisterBody, email: '  A@GMAIL.com ' });
    expect(res.body.data.email).toBe('a@gmail.com');
  });

  it('email đã có tài khoản → 409 EMAIL_EXISTS, không gửi mail', async () => {
    await createCustomer();
    const res = await register({ ...validRegisterBody, phone: '0987654321' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('số điện thoại đã có tài khoản → 409 PHONE_EXISTS', async () => {
    await createCustomer();
    const res = await register({ ...validRegisterBody, email: 'b@gmail.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_EXISTS');
  });

  it('đăng ký lại cùng email trước thời gian chờ → 429; sau thời gian chờ → ghi đè bản cũ', async () => {
    await register();
    const again = await register({ ...validRegisterBody, fullName: 'Trần Thị B' });
    expect(again.status).toBe(429);
    expect(again.body.error.code).toBe('OTP_RESEND_TOO_SOON');

    await skipResendCooldown();
    expect((await register({ ...validRegisterBody, fullName: 'Trần Thị B' })).status).toBe(200);
    const { rows } = await pool.query('SELECT full_name FROM pending_registrations');
    expect(rows).toEqual([{ full_name: 'Trần Thị B' }]);
  });

  it('gửi mail lỗi → 503 EMAIL_SEND_FAILED', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP down'));
    jest.spyOn(console, 'error').mockImplementationOnce(() => undefined);
    const res = await register();
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('EMAIL_SEND_FAILED');
  });

  it('dữ liệu sai → 422 VALIDATION_ERROR kèm chi tiết từng trường', async () => {
    const res = await register({
      fullName: 'A',
      phone: '12345',
      email: 'khong-phai-email',
      password: 'abcdefgh',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'phone', 'email', 'password']));
  });
});

describe('POST /api/auth/register/verify (bước 2: nhập OTP)', () => {
  beforeEach(async () => {
    await register();
  });

  it('mã đúng → tạo tài khoản CUSTOMER, KHÔNG tự đăng nhập, xoá bản tạm', async () => {
    const res = await verifyRegister(lastOtp());

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      id: 1,
      fullName: 'Nguyễn Văn A',
      email: 'a@gmail.com',
      phone: '0912345678',
      role: 'CUSTOMER',
      avatarUrl: null,
    });
    expect((await pool.query('SELECT 1 FROM refresh_tokens')).rowCount).toBe(0);
    expect((await pool.query('SELECT 1 FROM pending_registrations')).rowCount).toBe(0);
    // Đăng nhập bằng mật khẩu đã nhập lúc đăng ký
    expect((await login()).status).toBe(200);
  });

  it('dùng lại mã đã xác minh → 400 REGISTRATION_NOT_FOUND', async () => {
    const otp = lastOtp();
    await verifyRegister(otp).expect(201);
    const res = await verifyRegister(otp);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REGISTRATION_NOT_FOUND');
  });

  it('mã sai → 400 INVALID_OTP kèm số lần còn lại; sai quá số lần → xoá, phải đăng ký lại', async () => {
    const otp = lastOtp();
    for (let i = 1; i < env.REGISTER_OTP_MAX_ATTEMPTS; i++) {
      const res = await verifyRegister(wrongOtp(otp));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OTP');
      expect(res.body.error.message).toContain(`còn ${env.REGISTER_OTP_MAX_ATTEMPTS - i} lần`);
    }
    const last = await verifyRegister(wrongOtp(otp));
    expect(last.body.error.code).toBe('OTP_TOO_MANY_ATTEMPTS');

    // Mã đúng cũng không dùng được nữa
    expect((await verifyRegister(otp)).body.error.code).toBe('REGISTRATION_NOT_FOUND');
    expect((await pool.query('SELECT 1 FROM users')).rowCount).toBe(0);
  });

  it('mã hết hạn → 400 OTP_EXPIRED', async () => {
    await pool.query(
      `UPDATE pending_registrations SET otp_expires_at = now() - interval '1 second'`,
    );
    const res = await verifyRegister(lastOtp());
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('OTP_EXPIRED');
  });

  it('email chưa đăng ký → 400 REGISTRATION_NOT_FOUND', async () => {
    const res = await verifyRegister('123456', 'khongco@gmail.com');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REGISTRATION_NOT_FOUND');
  });

  it('SĐT bị tài khoản khác dùng trong lúc chờ xác minh → 409 PHONE_EXISTS, xoá bản tạm', async () => {
    await createCustomer({ ...validRegisterBody, email: 'b@gmail.com' });
    const res = await verifyRegister(lastOtp());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_EXISTS');
    expect((await pool.query('SELECT 1 FROM pending_registrations')).rowCount).toBe(0);
  });

  it('mã không đúng định dạng → 422', async () => {
    expect((await verifyRegister('12ab')).status).toBe(422);
  });
});

describe('POST /api/auth/register/resend', () => {
  beforeEach(async () => {
    await register();
  });

  it('gửi lại trước thời gian chờ → 429 OTP_RESEND_TOO_SOON', async () => {
    const res = await resendOtp();
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('OTP_RESEND_TOO_SOON');
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('gửi mã mới: mã cũ hết hiệu lực, số lần sai về 0', async () => {
    const oldOtp = lastOtp();
    await verifyRegister(wrongOtp(oldOtp)).expect(400);
    await skipResendCooldown();

    const res = await resendOtp();
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('a@gmail.com');
    const newOtp = lastOtp();
    const { rows } = await pool.query('SELECT attempts FROM pending_registrations');
    expect(rows[0].attempts).toBe(0);

    if (newOtp !== oldOtp) {
      expect((await verifyRegister(oldOtp)).body.error.code).toBe('INVALID_OTP');
    }
    expect((await verifyRegister(newOtp)).status).toBe(201);
  });

  it('email không có yêu cầu đăng ký → 400 REGISTRATION_NOT_FOUND', async () => {
    const res = await resendOtp('khongco@gmail.com');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('REGISTRATION_NOT_FOUND');
  });
});

describe('POST /api/auth/login & logout & /me', () => {
  beforeEach(async () => {
    await createCustomer();
  });

  it('đăng nhập đúng → trả user + cặp token trong body, không dùng cookie', async () => {
    const res = await login();
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('a@gmail.com');
    const tokens = getTokens(res);
    expect(tokens.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(res.headers['set-cookie']).toBeUndefined();

    // Chỉ lưu bản băm refresh token
    const { rows } = await pool.query('SELECT token_hash FROM refresh_tokens');
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toBe(tokens.refreshToken);

    const meRes = await me(tokens.accessToken);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe('a@gmail.com');
  });

  it('1 tài khoản đăng nhập nhiều nơi cùng lúc → mỗi nơi 1 phiên độc lập', async () => {
    const deviceA = getTokens(await login());
    const deviceB = getTokens(await login());

    expect((await me(deviceA.accessToken)).status).toBe(200);
    expect((await me(deviceB.accessToken)).status).toBe(200);

    // Thiết bị A đăng xuất → thiết bị B không bị ảnh hưởng
    await request(app).post('/api/auth/logout').send({ refreshToken: deviceA.refreshToken });
    expect((await refresh(deviceA.refreshToken)).status).toBe(401);
    expect((await refresh(deviceB.refreshToken)).status).toBe(200);
  });

  it('sai mật khẩu và email không tồn tại → cùng 401 INVALID_CREDENTIALS', async () => {
    const wrongPassword = await login('a@gmail.com', 'saimatkhau1');
    const unknownEmail = await login('khongco@gmail.com');

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('tài khoản bị khoá → 403 ACCOUNT_LOCKED (đăng nhập & gọi API)', async () => {
    const tokens = getTokens(await login());
    await pool.query(`UPDATE users SET is_active = false WHERE email = 'a@gmail.com'`);

    const res = await login();
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
    expect((await me(tokens.accessToken)).status).toBe(403);
  });

  it('đăng xuất → huỷ refresh token trong DB (không cần access token)', async () => {
    const tokens = getTokens(await login());
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: tokens.refreshToken });
    expect(res.status).toBe(204);
    expect((await refresh(tokens.refreshToken)).status).toBe(401);
  });

  it('đăng xuất không gửi refresh token → vẫn 204', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(204);
  });

  it('/me không có header Authorization → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('/me với token sai hoặc sai định dạng header → 401', async () => {
    expect((await me('abc')).status).toBe(401);
    const noBearer = await request(app).get('/api/auth/me').set('Authorization', 'abc');
    expect(noBearer.status).toBe(401);
  });

  it('access token hết hạn → 401', async () => {
    const expired = jwt.sign({ role: 'CUSTOMER' }, env.JWT_SECRET, {
      subject: '1',
      expiresIn: -10,
    });
    expect((await me(expired)).status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  beforeEach(async () => {
    await createCustomer();
  });

  it('đổi refresh token lấy cặp token mới (xoay vòng), token mới dùng được', async () => {
    const first = getTokens(await login());

    const res = await refresh(first.refreshToken);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('a@gmail.com');

    const second = getTokens(res);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect((await me(second.accessToken)).status).toBe(200);

    // Token cũ bị huỷ và trỏ tới token mới
    const { rows } = await pool.query(
      'SELECT revoked_at, replaced_by_id FROM refresh_tokens ORDER BY id',
    );
    expect(rows[0].revoked_at).not.toBeNull();
    expect(rows[0].replaced_by_id).toBe(2);
    expect(rows[1].revoked_at).toBeNull();
  });

  it('refresh token có hạn = REFRESH_TOKEN_TTL_DAYS (cấu hình trong .env)', async () => {
    await login();
    const { rows } = await pool.query(
      `SELECT EXTRACT(EPOCH FROM (expires_at - created_at)) / 86400 AS days FROM refresh_tokens`,
    );
    expect(Math.round(Number(rows[0].days))).toBe(env.REFRESH_TOKEN_TTL_DAYS);
  });

  it('thiếu / sai định dạng refresh token → 422', async () => {
    expect((await request(app).post('/api/auth/refresh').send({})).status).toBe(422);
    expect((await refresh('abc')).status).toBe(422);
  });

  it('refresh token không tồn tại → 401 INVALID_REFRESH_TOKEN', async () => {
    const res = await refresh('f'.repeat(64));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('refresh token hết hạn → 401', async () => {
    const tokens = getTokens(await login());
    await pool.query(`UPDATE refresh_tokens SET expires_at = now() - interval '1 minute'`);
    const res = await refresh(tokens.refreshToken);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('dùng lại token cũ NGAY sau khi xoay vòng (nhiều tab) → REFRESH_TOKEN_STALE, không huỷ phiên', async () => {
    const tokens = getTokens(await login());
    const first = await refresh(tokens.refreshToken);
    expect(first.status).toBe(200);

    const stale = await refresh(tokens.refreshToken);
    expect(stale.status).toBe(401);
    expect(stale.body.error.code).toBe('REFRESH_TOKEN_STALE');

    // Token mới vẫn dùng được
    expect((await refresh(getTokens(first).refreshToken)).status).toBe(200);
  });

  it('dùng lại token cũ SAU thời gian ân hạn → REFRESH_TOKEN_REUSED, huỷ mọi phiên', async () => {
    const tokens = getTokens(await login());
    const otherDevice = getTokens(await login());
    const rotated = await refresh(tokens.refreshToken);
    expect(rotated.status).toBe(200);

    await expireGracePeriod();

    const reused = await refresh(tokens.refreshToken);
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('REFRESH_TOKEN_REUSED');

    // Mọi phiên (kể cả token mới và thiết bị khác) đều bị huỷ
    expect((await refresh(getTokens(rotated).refreshToken)).status).toBe(401);
    expect((await refresh(otherDevice.refreshToken)).status).toBe(401);
  });

  it('tài khoản bị khoá → 403 ACCOUNT_LOCKED khi refresh', async () => {
    const tokens = getTokens(await login());
    await pool.query('UPDATE users SET is_active = false');
    const res = await refresh(tokens.refreshToken);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });
});

describe('Quên mật khẩu', () => {
  beforeEach(async () => {
    await createCustomer();
  });

  it('email có / không tồn tại → cùng một thông báo; chỉ gửi mail khi email tồn tại', async () => {
    const exists = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'a@gmail.com' });
    const notExists = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'khongco@gmail.com' });

    expect(exists.status).toBe(200);
    expect(exists.body).toEqual(notExists.body);
    await new Promise((resolve) => setImmediate(resolve));
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('luồng đầy đủ: verify → đặt lại → đăng nhập bằng mật khẩu mới', async () => {
    const token = await requestResetToken('a@gmail.com');

    await request(app).get('/api/auth/reset-password/verify').query({ token }).expect(200);

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'matkhaumoi9' });
    expect(reset.status).toBe(200);

    expect((await login('a@gmail.com', 'matkhau123')).status).toBe(401);
    expect((await login('a@gmail.com', 'matkhaumoi9')).status).toBe(200);
  });

  it('token chỉ dùng được 1 lần', async () => {
    const token = await requestResetToken('a@gmail.com');
    await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'matkhaumoi9' })
      .expect(200);

    const again = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'matkhaukhac9' });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('yêu cầu mới làm token cũ hết hiệu lực', async () => {
    const oldToken = await requestResetToken('a@gmail.com');
    await requestResetToken('a@gmail.com');

    const res = await request(app)
      .get('/api/auth/reset-password/verify')
      .query({ token: oldToken });
    expect(res.status).toBe(400);
  });

  it('token hết hạn → 400', async () => {
    const token = await requestResetToken('a@gmail.com');
    await pool.query(`UPDATE password_resets SET expires_at = now() - interval '1 minute'`);
    const res = await request(app).get('/api/auth/reset-password/verify').query({ token });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('đặt lại mật khẩu → access token cũ bị từ chối & mọi refresh token bị huỷ', async () => {
    const session = getTokens(await login());
    // Access token "cũ": cấp 1 phút trước lần đặt lại mật khẩu
    const oldAccess = jwt.sign(
      { role: 'CUSTOMER', iat: Math.floor(Date.now() / 1000) - 60 },
      env.JWT_SECRET,
      { subject: '1', expiresIn: 3600 },
    );
    expect((await me(oldAccess)).status).toBe(200);

    const token = await requestResetToken('a@gmail.com');
    await request(app)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: 'matkhaumoi9' })
      .expect(200);

    expect((await me(oldAccess)).status).toBe(401);
    expect((await refresh(session.refreshToken)).status).toBe(401);
  });
});

describe('Phân quyền /api/admin', () => {
  it('chưa đăng nhập → 401, CUSTOMER → 403, ADMIN → qua được lớp phân quyền', async () => {
    const anonymous = await request(app).get('/api/admin/khong-ton-tai');
    expect(anonymous.status).toBe(401);

    await createCustomer();
    const customer = getTokens(await login());
    const asCustomer = await request(app)
      .get('/api/admin/khong-ton-tai')
      .set('Authorization', bearer(customer.accessToken));
    expect(asCustomer.status).toBe(403);
    expect(asCustomer.body.error.code).toBe('FORBIDDEN');

    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, 'ADMIN')`,
      ['Quản trị viên', 'admin@bookstore.vn', await hashPassword('admin12345')],
    );
    const admin = getTokens(await login('admin@bookstore.vn', 'admin12345'));
    const asAdmin = await request(app)
      .get('/api/admin/khong-ton-tai')
      .set('Authorization', bearer(admin.accessToken));
    // Qua được requireRole → rơi vào 404 vì route chưa tồn tại
    expect(asAdmin.status).toBe(404);
  });
});
