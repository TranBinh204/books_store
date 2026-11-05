import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { loginAsAdmin } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';
import { createBook, newCustomer, placeOrder } from '../helpers/shop';

// M11 – Voucher (docs/03-modules/11-voucher.md)

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

const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/** Voucher hợp lệ đang chạy: giảm 10%, tối đa 30.000₫, đơn từ 100.000₫ */
const voucherBody = (overrides: object = {}) => ({
  code: 'SACHHAY10',
  description: 'Mừng khai trương',
  discountType: 'PERCENT',
  discountValue: 10,
  maxDiscount: 30000,
  minOrderValue: 100000,
  startAt: at(-1),
  endAt: at(30),
  usageLimit: null,
  perUserLimit: 1,
  isPublic: true,
  isActive: true,
  ...overrides,
});

const adminApi = {
  create: (body: object) =>
    request(app).post('/api/admin/vouchers').set('Authorization', admin).send(body),
  update: (id: number, body: object) =>
    request(app).patch(`/api/admin/vouchers/${id}`).set('Authorization', admin).send(body),
  remove: (id: number) =>
    request(app).delete(`/api/admin/vouchers/${id}`).set('Authorization', admin),
  list: (query = '') => request(app).get(`/api/admin/vouchers${query}`).set('Authorization', admin),
  detail: (id: number) => request(app).get(`/api/admin/vouchers/${id}`).set('Authorization', admin),
  orders: (id: number) =>
    request(app).get(`/api/admin/vouchers/${id}/orders`).set('Authorization', admin),
};

async function createVoucher(overrides: object = {}) {
  const res = await adminApi.create(voucherBody(overrides));
  if (res.status !== 201) throw new Error(`Tạo voucher lỗi: ${JSON.stringify(res.body)}`);
  return res.body.data as { id: number; code: string };
}

const check = (auth: string, code: string) =>
  request(app).post('/api/me/vouchers/check').set('Authorization', auth).send({ code });

const addToCart = (auth: string, bookId: number, quantity: number) =>
  request(app).post('/api/me/cart/items').set('Authorization', auth).send({ bookId, quantity });

const usedCount = async (id: number) =>
  (await pool.query<{ n: number }>('SELECT used_count AS n FROM vouchers WHERE id = $1', [id]))
    .rows[0].n;

describe('Admin tạo voucher', () => {
  it('tạo được; mã chữ thường tự đổi in hoa; trùng mã → 409', async () => {
    const res = await adminApi.create(voucherBody({ code: ' sachhay10 ' }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      code: 'SACHHAY10',
      status: 'ACTIVE',
      usedCount: 0,
      orderCount: 0,
    });

    const dup = await adminApi.create(voucherBody());
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('CONFLICT');
  });

  it('sai ràng buộc → 422 (mã có ký tự lạ, % > 100, kết thúc trước bắt đầu)', async () => {
    for (const body of [
      voucherBody({ code: 'GIẢM-10' }),
      voucherBody({ discountValue: 120 }),
      voucherBody({ startAt: at(5), endAt: at(1) }),
    ]) {
      const res = await adminApi.create(body);
      expect(res.status).toBe(422);
    }
  });

  it('giảm số tiền → bỏ "giảm tối đa"', async () => {
    const res = await adminApi.create(
      voucherBody({ code: 'GIAM50K', discountType: 'FIXED', discountValue: 50000 }),
    );
    expect(res.body.data).toMatchObject({ discountType: 'FIXED', maxDiscount: null });
  });

  it('danh sách lọc theo trạng thái & công khai', async () => {
    await createVoucher();
    await createVoucher({ code: 'SAPCO', startAt: at(2), endAt: at(10) });
    await createVoucher({ code: 'HETHAN', startAt: at(-10), endAt: at(-1) });
    await createVoucher({ code: 'DATAT', isActive: false });
    await createVoucher({ code: 'RIENGTU', isPublic: false });

    const codes = async (query: string) =>
      ((await adminApi.list(query)).body.data as { code: string }[]).map((v) => v.code).sort();
    expect(await codes('?status=UPCOMING')).toEqual(['SAPCO']);
    expect(await codes('?status=EXPIRED')).toEqual(['HETHAN']);
    expect(await codes('?status=DISABLED')).toEqual(['DATAT']);
    expect(await codes('?status=ACTIVE')).toEqual(['RIENGTU', 'SACHHAY10']);
    expect(await codes('?visibility=private')).toEqual(['RIENGTU']);
    expect((await adminApi.list('?q=hay')).body.meta.total).toBe(1);
  });
});

describe('Trang chủ — GET /api/vouchers', () => {
  it('chỉ mã công khai đang dùng được, sắp hết hạn trước', async () => {
    await createVoucher({ code: 'XAHAN', endAt: at(30) });
    await createVoucher({ code: 'GANHAN', endAt: at(3) });
    await createVoucher({ code: 'RIENGTU', isPublic: false });
    await createVoucher({ code: 'SAPCO', startAt: at(2), endAt: at(10) });
    await createVoucher({ code: 'DATAT', isActive: false });

    const res = await request(app).get('/api/vouchers');
    expect(res.status).toBe(200);
    expect(res.body.data.map((v: { code: string }) => v.code)).toEqual(['GANHAN', 'XAHAN']);
    expect(res.body.data[0]).not.toHaveProperty('usedCount');
  });
});

describe('Kiểm tra mã — POST /api/me/vouchers/check', () => {
  it('tính tiền giảm theo giỏ hàng trên server', async () => {
    await createVoucher();
    const book = await createBook({ price: 60000 });
    const { auth } = await newCustomer();
    await addToCart(auth, book, 2);

    const res = await check(auth, 'sachhay10');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      code: 'SACHHAY10',
      subtotal: 120000,
      discountAmount: 12000,
      total: 108000,
    });
  });

  it('báo đúng lý do không dùng được', async () => {
    await createVoucher();
    await createVoucher({ code: 'DATAT', isActive: false });
    await createVoucher({ code: 'SAPCO', startAt: at(2), endAt: at(10) });
    await createVoucher({ code: 'HETHAN', startAt: at(-10), endAt: at(-1) });
    const book = await createBook({ price: 60000 });
    const { auth } = await newCustomer();

    expect((await check(auth, 'SACHHAY10')).body.error.code).toBe('CART_EMPTY');
    await addToCart(auth, book, 1);

    const cases: [string, string][] = [
      ['KHONGCO', 'VOUCHER_NOT_FOUND'],
      ['a b', 'VOUCHER_NOT_FOUND'],
      ['DATAT', 'VOUCHER_INACTIVE'],
      ['SAPCO', 'VOUCHER_NOT_STARTED'],
      ['HETHAN', 'VOUCHER_EXPIRED'],
      ['SACHHAY10', 'VOUCHER_MIN_ORDER'],
    ];
    for (const [code, error] of cases) {
      const res = await check(auth, code);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(error);
    }
    expect((await check(auth, 'SACHHAY10')).body.error.message).toBe(
      'Đơn hàng tối thiểu 100.000₫ để dùng mã này (còn thiếu 40.000₫)',
    );
  });

  it('Admin không dùng được (chỉ CUSTOMER)', async () => {
    expect((await check(admin, 'SACHHAY10')).status).toBe(403);
  });
});

describe('Đặt hàng có voucher', () => {
  it('trừ tiền, giữ lượt, chi tiết đơn có mã; dùng lại → hết lượt / người', async () => {
    const voucher = await createVoucher();
    const book = await createBook({ price: 60000 });
    const { auth } = await newCustomer();

    const order = await placeOrder(auth, book, {
      quantity: 2,
      price: 60000,
      voucherCode: 'sachhay10',
      discount: 12000,
    });
    expect(order).toMatchObject({ total: 108000, discountAmount: 12000, voucherCode: 'SACHHAY10' });
    expect(await usedCount(voucher.id)).toBe(1);

    await addToCart(auth, book, 2);
    expect((await check(auth, 'SACHHAY10')).body.error.code).toBe('VOUCHER_USER_LIMIT');
  });

  it('tổng client gửi lệch → PRICE_CHANGED, không giữ lượt', async () => {
    const voucher = await createVoucher();
    const book = await createBook({ price: 60000 });
    const { auth } = await newCustomer();
    await expect(
      placeOrder(auth, book, { quantity: 2, price: 60000, voucherCode: 'SACHHAY10', discount: 0 }),
    ).rejects.toThrow('PRICE_CHANGED');
    expect(await usedCount(voucher.id)).toBe(0);
  });

  it('hết tổng lượt → khách khác bị chặn; huỷ đơn → trả lượt', async () => {
    const voucher = await createVoucher({ usageLimit: 1 });
    const book = await createBook({ price: 60000 });
    const a = await newCustomer();
    const b = await newCustomer();

    const order = await placeOrder(a.auth, book, {
      quantity: 2,
      price: 60000,
      voucherCode: 'SACHHAY10',
      discount: 12000,
    });
    await addToCart(b.auth, book, 2);
    expect((await check(b.auth, 'SACHHAY10')).body.error.code).toBe('VOUCHER_USED_UP');
    expect((await request(app).get('/api/vouchers')).body.data).toEqual([]);

    const cancel = await request(app)
      .post(`/api/me/orders/${order.id}/cancel`)
      .set('Authorization', a.auth)
      .send({ reason: 'Đổi ý' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data).toMatchObject({ discountAmount: 12000, voucherCode: 'SACHHAY10' });
    expect(await usedCount(voucher.id)).toBe(0);
    expect((await check(b.auth, 'SACHHAY10')).status).toBe(200);
  });

  it('2 khách cùng dùng lượt cuối → chỉ 1 người được', async () => {
    const voucher = await createVoucher({ usageLimit: 1 });
    const book = await createBook({ price: 60000, stock: 20 });
    const customers = await Promise.all([newCustomer(), newCustomer()]);
    const results = await Promise.allSettled(
      customers.map((c) =>
        placeOrder(c.auth, book, {
          quantity: 2,
          price: 60000,
          voucherCode: 'SACHHAY10',
          discount: 12000,
        }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(String(failed.reason)).toContain('VOUCHER_USED_UP');
    expect(await usedCount(voucher.id)).toBe(1);
  });

  it('mã không hợp lệ lúc đặt → lỗi voucher, đơn không được tạo', async () => {
    await createVoucher({ code: 'HETHAN', startAt: at(-10), endAt: at(-1) });
    const book = await createBook({ price: 60000 });
    const { auth } = await newCustomer();
    await expect(placeOrder(auth, book, { price: 60000, voucherCode: 'HETHAN' })).rejects.toThrow(
      'VOUCHER_EXPIRED',
    );
    const { rows } = await pool.query('SELECT 1 FROM orders');
    expect(rows).toHaveLength(0);
  });
});

describe('Admin sửa / xoá voucher đã dùng', () => {
  async function usedVoucher() {
    const voucher = await createVoucher({ usageLimit: 10 });
    const book = await createBook({ price: 60000 });
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book, {
      quantity: 2,
      price: 60000,
      voucherCode: 'SACHHAY10',
      discount: 12000,
    });
    return { voucher, order };
  }

  it('khoá mã / mức giảm; vẫn sửa được mô tả, hạn, tổng lượt, bật / tắt', async () => {
    const { voucher } = await usedVoucher();

    const locked = await adminApi.update(voucher.id, { discountValue: 20 });
    expect(locked.status).toBe(409);
    expect(locked.body.error.code).toBe('VOUCHER_IN_USE');

    const ok = await adminApi.update(voucher.id, {
      description: 'Gia hạn',
      endAt: at(60),
      usageLimit: 5,
      isActive: false,
      isPublic: false,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({
      description: 'Gia hạn',
      usageLimit: 5,
      status: 'DISABLED',
      orderCount: 1,
    });

    // Tổng lượt = số đã dùng: được; nhỏ hơn: 422
    await adminApi.update(voucher.id, { isActive: true });
    const other = await newCustomer();
    await placeOrder(other.auth, await createBook({ price: 60000 }), {
      quantity: 2,
      price: 60000,
      voucherCode: 'SACHHAY10',
      discount: 12000,
    });
    expect((await adminApi.update(voucher.id, { usageLimit: 2 })).status).toBe(200);
    const tooLow = await adminApi.update(voucher.id, { usageLimit: 1 });
    expect(tooLow.status).toBe(422);
    expect(tooLow.body.error.details[0].field).toBe('usageLimit');
  });

  it('đã có đơn → không xoá được (kể cả đơn đã huỷ); danh sách đơn đã dùng', async () => {
    const { voucher, order } = await usedVoucher();
    await pool.query(`UPDATE orders SET status = 'CANCELLED' WHERE id = $1`, [order.id]);

    const res = await adminApi.remove(voucher.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VOUCHER_IN_USE');

    const orders = await adminApi.orders(voucher.id);
    expect(orders.body.data).toEqual([
      expect.objectContaining({ orderId: order.id, orderCode: order.code, discountAmount: 12000 }),
    ]);
  });

  it('chưa có đơn → xoá cứng', async () => {
    const voucher = await createVoucher();
    expect((await adminApi.remove(voucher.id)).status).toBe(204);
    expect((await adminApi.detail(voucher.id)).status).toBe(404);
  });

  it('sửa khi chưa dùng: đổi được mọi trường; kết thúc ≤ bắt đầu → 422', async () => {
    const voucher = await createVoucher();
    const ok = await adminApi.update(voucher.id, { code: 'moi2026', discountValue: 15 });
    expect(ok.body.data).toMatchObject({ code: 'MOI2026', discountValue: 15 });

    const bad = await adminApi.update(voucher.id, { endAt: at(-2) });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details[0].field).toBe('endAt');
  });
});
