import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { loginAsAdmin } from '../helpers/admin';
import { validRegisterBody } from '../helpers/auth';
import { resetDatabase } from '../helpers/db';
import { createBook, newCustomer, placeOrder } from '../helpers/shop';

// M08 – Admin quản lý khách hàng (docs/03-modules/08-admin-customer-order.md mục 3.2)

jest.mock('../../src/lib/mailer');

let admin: string;

beforeEach(async () => {
  await resetDatabase();
  jest.mocked(mailer.sendMail).mockResolvedValue(undefined);
  admin = await loginAsAdmin();
});

afterAll(async () => {
  await pool.end();
});

const api = {
  list: (query = '') =>
    request(app).get(`/api/admin/customers${query}`).set('Authorization', admin),
  detail: (id: number) =>
    request(app).get(`/api/admin/customers/${id}`).set('Authorization', admin),
  lock: (id: number, reason = 'Bom hàng nhiều lần') =>
    request(app)
      .post(`/api/admin/customers/${id}/lock`)
      .set('Authorization', admin)
      .send({ reason }),
  unlock: (id: number) =>
    request(app).post(`/api/admin/customers/${id}/unlock`).set('Authorization', admin),
};

/** Đẩy đơn tới Đã giao qua API Admin */
async function deliver(orderId: number) {
  for (const [status, expectedStatus] of [
    ['CONFIRMED', 'PENDING'],
    ['SHIPPING', 'CONFIRMED'],
    ['DELIVERED', 'SHIPPING'],
  ]) {
    await request(app)
      .post(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', admin)
      .send({ status, expectedStatus });
  }
}

describe('Danh sách & chi tiết khách hàng', () => {
  it('chỉ CUSTOMER; số đơn, đã chi tiêu (chỉ đơn Đã giao); tìm; lọc khoá; sắp xếp', async () => {
    const book = await createBook({ price: 10000, stock: 50 });
    const a = await newCustomer({ fullName: 'Phạm Minh Đức', phone: '0901234567' });
    const b = await newCustomer({ fullName: 'Hoàng Lan' });
    const c = await newCustomer({ fullName: 'Vũ Thảo' });

    const a1 = await placeOrder(a.auth, book, { price: 10000, quantity: 3 });
    await placeOrder(a.auth, book, { price: 10000 }); // chưa giao → không tính chi tiêu
    const b1 = await placeOrder(b.auth, book, { price: 10000, quantity: 5 });
    await deliver(a1.id);
    await deliver(b1.id);
    await api.lock(c.id);

    const res = await api.list();
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(3); // không có Admin
    expect(res.body.data.map((x: { id: number }) => x.id)).toEqual([c.id, b.id, a.id]);
    expect(res.body.data.find((x: { id: number }) => x.id === a.id)).toMatchObject({
      fullName: 'Phạm Minh Đức',
      orderCount: 2,
      totalSpent: 30000,
      isActive: true,
    });
    expect(res.body.data[0]).not.toHaveProperty('passwordHash');

    const ids = async (query: string) =>
      (await api.list(query)).body.data.map((x: { id: number }) => x.id);
    expect(await ids('?sort=spent')).toEqual([b.id, a.id, c.id]);
    expect(await ids('?sort=orders')).toEqual([a.id, b.id, c.id]);
    expect(await ids('?status=locked')).toEqual([c.id]);
    expect(await ids('?status=active&sort=newest')).toEqual([b.id, a.id]);
    expect(await ids('?q=pham%20minh%20duc')).toEqual([a.id]);
    expect(await ids('?q=0901234')).toEqual([a.id]);
    expect(await ids(`?q=${encodeURIComponent(b.email)}`)).toEqual([b.id]);
    expect(await ids('?q=_')).toEqual([]);
  });

  it('chi tiết: hồ sơ, thống kê theo trạng thái, sổ địa chỉ; id Admin / không có → 404', async () => {
    const book = await createBook();
    const a = await newCustomer();
    const order = await placeOrder(a.auth, book);
    await placeOrder(a.auth, book);
    await deliver(order.id);

    const res = await api.detail(a.id);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: a.id,
      email: a.email,
      orderCount: 2,
      totalSpent: 50000,
      orderCounts: { DELIVERED: 1, PENDING: 1 },
      lockedAt: null,
      lockReason: null,
    });
    expect(res.body.data.lastOrderAt).not.toBeNull();
    // placeOrder thêm 1 địa chỉ mỗi lần
    expect(res.body.data.addresses).toHaveLength(2);

    const adminId = (await pool.query(`SELECT id FROM users WHERE role = 'ADMIN'`)).rows[0].id;
    expect((await api.detail(adminId)).status).toBe(404);
    expect((await api.lock(adminId)).status).toBe(404);
    expect((await api.detail(999999)).status).toBe(404);
  });
});

describe('Khoá / mở khoá', () => {
  it('khoá → token đang dùng bị 403, refresh bị huỷ, không đăng nhập được; mở khoá → đăng nhập lại được', async () => {
    const a = await newCustomer();
    expect((await request(app).get('/api/me').set('Authorization', a.auth)).status).toBe(200);

    const locked = await api.lock(a.id, 'Gian lận');
    expect(locked.status).toBe(200);
    expect(locked.body.data).toMatchObject({ isActive: false, lockReason: 'Gian lận' });
    expect(locked.body.data.lockedAt).not.toBeNull();

    const me = await request(app).get('/api/me').set('Authorization', a.auth);
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe('ACCOUNT_LOCKED');
    expect(
      (await request(app).post('/api/auth/refresh').send({ refreshToken: a.refreshToken })).status,
    ).not.toBe(200);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: a.email, password: validRegisterBody.password });
    expect(login.body.error.code).toBe('ACCOUNT_LOCKED');

    expect((await api.lock(a.id)).body.error.code).toBe('ALREADY_LOCKED');
    expect((await api.lock(a.id, '')).status).toBe(422);

    const unlocked = await api.unlock(a.id);
    expect(unlocked.body.data).toMatchObject({ isActive: true, lockedAt: null, lockReason: null });
    const relogin = await request(app)
      .post('/api/auth/login')
      .send({ email: a.email, password: validRegisterBody.password });
    expect(relogin.status).toBe(200);
    expect((await api.unlock(a.id)).body.error.code).toBe('NOT_LOCKED');
  });

  it('khách hàng gọi API Admin → 403', async () => {
    const a = await newCustomer();
    expect(
      (await request(app).get('/api/admin/customers').set('Authorization', a.auth)).status,
    ).toBe(403);
  });
});
