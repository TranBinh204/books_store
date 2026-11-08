import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { loginAsAdmin } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';
import { createBook, markPaid, newCustomer, placeOrder } from '../helpers/shop';

// M14 – Admin Dashboard (docs/03-modules/14-admin-dashboard.md)

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

const get = (path: string) => request(app).get(`/api/admin${path}`).set('Authorization', admin);

/** Đặt lại thời điểm đặt đơn — giờ Việt Nam, vd "2026-09-01 23:30" */
const setCreatedAt = (orderId: number, vietnamTime: string) =>
  pool.query(`UPDATE orders SET created_at = ($2 || '+07')::timestamptz WHERE id = $1`, [
    orderId,
    vietnamTime,
  ]);

const cancel = (auth: string, orderId: number) =>
  request(app)
    .post(`/api/me/orders/${orderId}/cancel`)
    .set('Authorization', auth)
    .send({ reason: 'Đổi ý' });

describe('Tổng quan', () => {
  it('chỉ tính đơn chưa huỷ & (COD hoặc VNPay đã trả); kỳ trước; khách mới; giá trị TB', async () => {
    const book = await createBook({ price: 100000, stock: 50 });
    const { auth } = await newCustomer();
    const cod = await placeOrder(auth, book, { quantity: 2, price: 100000 });
    const vnpayPaid = await placeOrder(auth, book, { method: 'VNPAY', price: 100000 });
    const vnpayUnpaid = await placeOrder(auth, book, { method: 'VNPAY', price: 100000 });
    const cancelled = await placeOrder(auth, book, { price: 100000 });
    const lastPeriod = await placeOrder(auth, book, { quantity: 4, price: 100000 });
    await markPaid(vnpayPaid.id);
    await cancel(auth, cancelled.id);
    for (const order of [cod, vnpayPaid, vnpayUnpaid, cancelled]) {
      await setCreatedAt(order.id, '2026-09-02 10:00');
    }
    await setCreatedAt(lastPeriod.id, '2026-08-31 10:00'); // kỳ trước của 01/09 – 03/09
    await pool.query(`UPDATE users SET created_at = '2026-09-01 08:00+07' WHERE role = 'CUSTOMER'`);

    const res = await get('/dashboard/overview?from=2026-09-01&to=2026-09-03');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      range: { from: '2026-09-01', to: '2026-09-03', granularity: 'day' },
      previousRange: { from: '2026-08-29', to: '2026-08-31' },
      metrics: {
        revenue: 300000,
        orders: 2,
        avgOrderValue: 150000,
        cancelledOrders: 1,
        newCustomers: 1,
        voucherDiscount: 0,
      },
      previous: { revenue: 400000, orders: 1, avgOrderValue: 400000, newCustomers: 0 },
    });
  });

  it('gán ngày theo giờ VN, ngày không có đơn = 0; khoảng > 62 ngày → theo tháng', async () => {
    const book = await createBook({ price: 50000, stock: 50 });
    const { auth } = await newCustomer();
    const late = await placeOrder(auth, book, { price: 50000 });
    const early = await placeOrder(auth, book, { price: 50000 });
    await setCreatedAt(late.id, '2026-09-01 23:30'); // 16:30 UTC — vẫn là ngày 01/09 giờ VN
    await setCreatedAt(early.id, '2026-09-03 00:10'); // 17:10 UTC ngày 02/09
    await pool.query(`UPDATE users SET created_at = '2026-09-01 08:00+07' WHERE role = 'CUSTOMER'`);

    const daily = await get('/dashboard/overview?from=2026-09-01&to=2026-09-03');
    expect(daily.body.data.chart).toEqual([
      { date: '2026-09-01', revenue: 50000, orders: 1, newCustomers: 1 },
      { date: '2026-09-02', revenue: 0, orders: 0, newCustomers: 0 },
      { date: '2026-09-03', revenue: 50000, orders: 1, newCustomers: 0 },
    ]);

    const monthly = await get('/dashboard/overview?from=2026-07-15&to=2026-10-05');
    expect(monthly.body.data.range.granularity).toBe('month');
    expect(monthly.body.data.chart).toEqual([
      { date: '2026-07', revenue: 0, orders: 0, newCustomers: 0 },
      { date: '2026-08', revenue: 0, orders: 0, newCustomers: 0 },
      { date: '2026-09', revenue: 100000, orders: 2, newCustomers: 1 },
      { date: '2026-10', revenue: 0, orders: 0, newCustomers: 0 },
    ]);
  });

  it('top sách: nhiều cuốn trước, chỉ đơn được tính, doanh thu theo giá trong đơn', async () => {
    const a = await createBook({ price: 50000, stock: 50, title: 'Sách A' });
    const b = await createBook({ price: 80000, stock: 50, title: 'Sách B' });
    const { auth } = await newCustomer();
    await placeOrder(auth, a, { quantity: 1, price: 50000 });
    await placeOrder(auth, b, { quantity: 3, price: 80000 });
    const cancelled = await placeOrder(auth, a, { quantity: 5, price: 50000 });
    await cancel(auth, cancelled.id);

    const res = await get('/dashboard/overview');
    expect(res.body.data.range.granularity).toBe('day');
    expect(res.body.data.chart).toHaveLength(7);
    expect(res.body.data.topBooks).toEqual([
      { bookId: b, title: 'Sách B', image: null, quantity: 3, revenue: 240000 },
      { bookId: a, title: 'Sách A', image: null, quantity: 1, revenue: 50000 },
    ]);
  });

  it('khoảng không hợp lệ → 422; khách hàng → 403', async () => {
    expect((await get('/dashboard/overview?from=2026-09-01')).status).toBe(422);
    expect((await get('/dashboard/overview?from=2026-09-05&to=2026-09-01')).status).toBe(422);
    expect((await get('/dashboard/overview?from=2025-01-01&to=2026-09-01')).status).toBe(422);
    const { auth } = await newCustomer();
    const res = await request(app).get('/api/admin/dashboard/tasks').set('Authorization', auth);
    expect(res.status).toBe(403);
  });
});

describe('Việc cần làm', () => {
  it('đếm đơn theo nhóm (bỏ VNPay chưa trả), đơn chờ lâu nhất, sách sắp hết', async () => {
    const book = await createBook({ price: 50000, stock: 50 });
    const low = await createBook({ price: 50000, stock: 2, title: 'Sắp hết' });
    await createBook({ price: 50000, stock: 0, title: 'Hết hàng' });
    const hidden = await createBook({ price: 50000, stock: 1, title: 'Đang ẩn' });
    await pool.query('UPDATE books SET is_active = false WHERE id = $1', [hidden]);

    const { auth } = await newCustomer({ fullName: 'Trần Thị Bích' });
    const oldest = await placeOrder(auth, book, { price: 50000 });
    await placeOrder(auth, book, { method: 'VNPAY', price: 50000 }); // chưa trả → không cần xử lý
    const paid = await placeOrder(auth, book, { method: 'VNPAY', price: 50000 });
    await markPaid(paid.id);
    await setCreatedAt(oldest.id, '2026-09-01 08:00');

    const res = await get('/dashboard/tasks');
    expect(res.status).toBe(200);
    expect(res.body.data.orders).toEqual({ toConfirm: 2, toShip: 0, shipping: 0, needsRefund: 0 });
    expect(res.body.data.oldestToConfirm[0]).toMatchObject({
      id: oldest.id,
      customerName: 'Trần Thị Bích',
      total: 50000,
    });
    expect(res.body.data.lowStock.total).toBe(2);
    expect(res.body.data.lowStock.items.map((b: { title: string }) => b.title)).toEqual([
      'Hết hàng',
      'Sắp hết',
    ]);
    expect(res.body.data.lowStock.items[1]).toMatchObject({ id: low, stock: 2 });
  });
});

describe('Xuất CSV', () => {
  it('doanh thu theo ngày · danh sách đơn (mọi trạng thái) · top sách — có BOM, tên file', async () => {
    const book = await createBook({ price: 50000, stock: 50, title: 'Sách, "đặc biệt"' });
    const { auth } = await newCustomer();
    const kept = await placeOrder(auth, book, { quantity: 2, price: 50000 });
    const cancelled = await placeOrder(auth, book, { price: 50000 });
    await cancel(auth, cancelled.id);
    await setCreatedAt(kept.id, '2026-09-02 09:00');
    await setCreatedAt(cancelled.id, '2026-09-02 10:00');
    const query = '?from=2026-09-01&to=2026-09-02';

    const revenue = await get(`/reports/revenue.csv${query}`);
    expect(revenue.status).toBe(200);
    expect(revenue.headers['content-type']).toContain('text/csv');
    expect(revenue.headers['content-disposition']).toBe(
      'attachment; filename="bookstore-revenue-2026-09-01_2026-09-02.csv"',
    );
    expect(revenue.text).toBe(
      '﻿Ngày,Số đơn,Doanh thu,Giảm giá voucher\r\n01/09/2026,0,0,0\r\n02/09/2026,1,100000,0\r\n',
    );

    const orders = (await get(`/reports/orders.csv${query}`)).text.split('\r\n');
    expect(orders).toHaveLength(4); // tiêu đề + 2 đơn + dòng trống cuối
    expect(orders[1]).toContain(`${kept.code},02/09/2026 09:00`);
    expect(orders[1]).toMatch(/Chờ xác nhận,COD,Chưa thanh toán,2,100000,0,,100000,Có$/);
    expect(orders[2]).toMatch(/Đã huỷ,.*,Không$/);

    const top = (await get(`/reports/top-books.csv${query}`)).text;
    expect(top).toContain(`1,${book},"Sách, ""đặc biệt""",2,100000`);
  });
});
