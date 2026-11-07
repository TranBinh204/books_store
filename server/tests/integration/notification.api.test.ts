import request from 'supertest';
import { app } from '../../src/app';
import { env } from '../../src/config/env';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { sign, signData, type VnpParams } from '../../src/lib/vnpay';
import {
  notifyUpcomingFlashSales,
  purgeOldNotifications,
} from '../../src/services/notification.service';
import { expireUnpaidOrders } from '../../src/services/order.service';
import { loginAsAdmin } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';
import { createBook, deliverOrder, newCustomer, placeOrder } from '../helpers/shop';

// M13 – Notification (docs/03-modules/13-notification.md)

jest.mock('../../src/lib/mailer');
const sendMail = jest.mocked(mailer.sendMail);

let admin: string;

beforeEach(async () => {
  await resetDatabase();
  jest.clearAllMocks();
  sendMail.mockResolvedValue(undefined);
  admin = await loginAsAdmin();
});

afterAll(async () => {
  await pool.end();
});

const me = (auth: string) => ({
  list: (query = '') =>
    request(app).get(`/api/me/notifications${query}`).set('Authorization', auth),
  unread: async () =>
    (await request(app).get('/api/me/notifications/unread-count').set('Authorization', auth)).body
      .data.count as number,
  read: (id: number) =>
    request(app).post(`/api/me/notifications/${id}/read`).set('Authorization', auth),
  readAll: () => request(app).post('/api/me/notifications/read-all').set('Authorization', auth),
  cancel: (orderId: number) =>
    request(app)
      .post(`/api/me/orders/${orderId}/cancel`)
      .set('Authorization', auth)
      .send({ reason: 'Đổi ý' }),
});

const events = async (auth: string) =>
  ((await me(auth).list()).body.data as { event: string }[]).map((n) => n.event);

/** Email gửi không chờ — đợi 1 nhịp cho các email đang gửi xong */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

/** Bỏ qua email đã gửi trước đó (vd xác nhận đặt hàng COD) */
async function clearMails() {
  await settle();
  sendMail.mockClear();
}

async function mailSubjects() {
  await settle();
  return sendMail.mock.calls.map(([mail]) => mail.subject);
}

describe('API thông báo của tôi', () => {
  it('đặt hàng → 1 thông báo chưa đọc; đọc 1 / đọc tất cả; không đọc được của người khác', async () => {
    const book = await createBook({ price: 60000 });
    const a = await newCustomer();
    const b = await newCustomer();
    const order = await placeOrder(a.auth, book, { quantity: 2, price: 60000 });

    const list = await me(a.auth).list();
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      type: 'ORDER',
      event: 'ORDER_PLACED',
      title: 'Đặt hàng thành công',
      content: expect.stringContaining('2 sản phẩm · 120.000₫'),
      link: `/tai-khoan/don-hang/${order.id}`,
      isRead: false,
    });
    expect(await me(a.auth).unread()).toBe(1);

    const id = list.body.data[0].id;
    expect((await me(b.auth).read(id)).status).toBe(404);
    expect((await me(a.auth).read(id)).status).toBe(204);
    expect(await me(a.auth).unread()).toBe(0);

    await placeOrder(a.auth, book, { price: 60000 });
    await placeOrder(a.auth, book, { price: 60000 });
    expect((await me(a.auth).list('?unread=true')).body.data).toHaveLength(2);
    const all = await me(a.auth).readAll();
    expect(all.body.data).toEqual({ updated: 2 });
    expect(await me(a.auth).unread()).toBe(0);
    expect(await me(b.auth).unread()).toBe(0);
  });

  it('Admin → 403, chưa đăng nhập → 401', async () => {
    expect(
      (await request(app).get('/api/me/notifications').set('Authorization', admin)).status,
    ).toBe(403);
    expect((await request(app).get('/api/me/notifications')).status).toBe(401);
  });
});

describe('Sự kiện đơn hàng', () => {
  it('Admin xác nhận → giao → đã giao: 3 thông báo + 3 email mới (đã giao nhắc đánh giá)', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book);
    await clearMails();

    await deliverOrder(admin, order.id);

    expect(await events(auth)).toEqual([
      'ORDER_DELIVERED',
      'ORDER_SHIPPING',
      'ORDER_CONFIRMED',
      'ORDER_PLACED',
    ]);
    const delivered = (await me(auth).list()).body.data[0];
    expect(delivered.content).toContain('Hãy đánh giá sách');
    expect(await mailSubjects()).toEqual([
      `BookStore – Đơn hàng ${order.code} đã được xác nhận`,
      `BookStore – Đơn hàng ${order.code} đang được giao`,
      `BookStore – Đơn hàng ${order.code} đã giao thành công`,
    ]);
  });

  it('khách tự huỷ → thông báo, không email · Admin huỷ → thông báo kèm lý do', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    const mine = await placeOrder(auth, book);
    const other = await placeOrder(auth, book);
    await clearMails();

    await me(auth).cancel(mine.id);
    const byCustomer = (await me(auth).list()).body.data[0];
    expect(byCustomer).toMatchObject({ event: 'ORDER_CANCELLED', title: 'Đã huỷ đơn hàng' });
    expect(await mailSubjects()).toEqual([]);

    await request(app)
      .post(`/api/admin/orders/${other.id}/cancel`)
      .set('Authorization', admin)
      .send({ reason: 'Hết hàng trong kho', expectedStatus: 'PENDING' });
    const byShop = (await me(auth).list()).body.data[0];
    expect(byShop).toMatchObject({ event: 'ORDER_CANCELLED', title: 'Đơn hàng đã bị huỷ' });
    expect(byShop.content).toContain('Lý do: Hết hàng trong kho');
  });

  it('VNPay: thanh toán thất bại / thành công → thông báo; IPN gửi lại không trùng; quá hạn → huỷ + email', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book, { method: 'VNPAY' });
    const placed = (await me(auth).list()).body.data[0];
    expect(placed.content).toContain('Vui lòng thanh toán trước');

    const pay = async () => {
      const res = await request(app)
        .post(`/api/me/orders/${order.id}/vnpay`)
        .set('Authorization', auth);
      return Object.fromEntries(new URL(res.body.data.paymentUrl).searchParams) as VnpParams;
    };
    const ipn = (payment: VnpParams, overrides: Partial<VnpParams> = {}) => {
      const params: VnpParams = {
        vnp_TmnCode: payment.vnp_TmnCode,
        vnp_Amount: payment.vnp_Amount,
        vnp_OrderInfo: payment.vnp_OrderInfo,
        vnp_ResponseCode: '00',
        vnp_TransactionNo: '14567890',
        vnp_TransactionStatus: '00',
        vnp_TxnRef: payment.vnp_TxnRef,
        ...overrides,
      };
      return request(app).get(
        `/api/payments/vnpay/ipn?${signData(params)}&vnp_SecureHash=${sign(params, env.VNPAY_HASH_SECRET!)}`,
      );
    };

    const failed = await pay();
    await ipn(failed, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' });
    await ipn(failed, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' });
    const success = await pay();
    await ipn(success);
    await ipn(success);
    expect(await events(auth)).toEqual(['PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'ORDER_PLACED']);

    // Đơn VNPay khác quá hạn → job tự huỷ
    const late = await placeOrder(auth, book, { method: 'VNPAY' });
    await pool.query(
      `UPDATE orders SET payment_due_at = now() - make_interval(mins => $2::int + 1) WHERE id = $1`,
      [late.id, env.VNPAY_CANCEL_GRACE_MINUTES],
    );
    await clearMails();
    expect(await expireUnpaidOrders()).toBe(1);
    expect((await events(auth))[0]).toBe('ORDER_EXPIRED');
    expect(await mailSubjects()).toEqual([
      `BookStore – Đơn hàng ${late.code} đã bị huỷ do quá hạn thanh toán`,
    ]);
  });
});

describe('Job', () => {
  const MINUTE = 60 * 1000;
  const at = (minutes: number) => new Date(Date.now() + minutes * MINUTE).toISOString();

  async function createSale(items: object[], startInMinutes: number) {
    const res = await request(app)
      .post('/api/admin/flash-sales')
      .set('Authorization', admin)
      .send({
        name: 'Flash Sale tối',
        startAt: at(startInMinutes),
        endAt: at(startInMinutes + 120),
        items,
      });
    if (res.status !== 201) throw new Error(JSON.stringify(res.body));
    return res.body.data as { id: number };
  }

  const like = (auth: string, bookId: number) =>
    request(app).put(`/api/me/wishlist/${bookId}`).set('Authorization', auth);

  it('flash sale sắp diễn ra: chỉ báo khách có sách yêu thích, 1 lần / chương trình, gộp nhiều sách', async () => {
    const a = await createBook({ price: 60000, title: 'Nhà Giả Kim' });
    const b = await createBook({ price: 80000, title: 'Đắc Nhân Tâm' });
    const one = await newCustomer();
    const two = await newCustomer();
    const none = await newCustomer();
    await like(one.auth, a);
    await like(two.auth, a);
    await like(two.auth, b);

    // Còn 5 giờ mới bắt đầu → chưa báo
    await createSale([{ bookId: a, salePrice: 30000, quantity: 5 }], 300);
    await createSale(
      [
        { bookId: a, salePrice: 39000, quantity: 5 },
        { bookId: b, salePrice: 50000, quantity: 5 },
      ],
      30,
    );

    expect(await notifyUpcomingFlashSales()).toBe(1);
    expect(await notifyUpcomingFlashSales()).toBe(0);

    const first = (await me(one.auth).list()).body.data;
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      type: 'PROMOTION',
      event: 'FLASH_SALE_UPCOMING',
      content: expect.stringContaining(
        '"Nhà Giả Kim" trong danh sách yêu thích của bạn chỉ còn 39.000₫',
      ),
      link: `/sach/${a}`,
    });
    const second = (await me(two.auth).list()).body.data;
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      content: expect.stringContaining('và 1 sách yêu thích khác'),
      link: '/flash-sale',
    });
    expect(await me(none.auth).unread()).toBe(0);
  });

  it('xoá thông báo cũ hơn 90 ngày', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    await placeOrder(auth, book);
    await placeOrder(auth, book);
    await pool.query(
      `UPDATE notifications SET created_at = now() - interval '91 days'
       WHERE id = (SELECT min(id) FROM notifications)`,
    );
    expect(await purgeOldNotifications()).toBe(1);
    expect((await me(auth).list()).body.data).toHaveLength(1);
  });
});
