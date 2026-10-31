import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { loginAsAdmin } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';
import { bookStock, createBook, markPaid, newCustomer, placeOrder } from '../helpers/shop';

// M08 – Admin xử lý đơn hàng (docs/03-modules/08-admin-customer-order.md)

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

const api = {
  list: (query = '') => request(app).get(`/api/admin/orders${query}`).set('Authorization', admin),
  summary: () => request(app).get('/api/admin/orders/summary').set('Authorization', admin),
  detail: (id: number) => request(app).get(`/api/admin/orders/${id}`).set('Authorization', admin),
  status: (id: number, status: string, expectedStatus: string, note?: string) =>
    request(app)
      .post(`/api/admin/orders/${id}/status`)
      .set('Authorization', admin)
      .send({ status, expectedStatus, note }),
  cancel: (id: number, expectedStatus: string, reason = 'Hết hàng') =>
    request(app)
      .post(`/api/admin/orders/${id}/cancel`)
      .set('Authorization', admin)
      .send({ reason, expectedStatus }),
  refund: (id: number, note = 'Mã hoàn VNP123') =>
    request(app).post(`/api/admin/orders/${id}/refund`).set('Authorization', admin).send({ note }),
};

/** Chờ các email gửi không chờ (fire-and-forget) chạy xong */
const flushEmails = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('Luồng trạng thái', () => {
  it('PENDING → CONFIRMED → SHIPPING → DELIVERED, lịch sử ghi Admin; COD giao xong → PAID + payments COD', async () => {
    const book = await createBook();
    const customer = await newCustomer();
    const order = await placeOrder(customer.auth, book, { quantity: 2 });

    expect((await api.status(order.id, 'CONFIRMED', 'PENDING', 'Đã gọi xác nhận')).status).toBe(
      200,
    );
    expect((await api.status(order.id, 'SHIPPING', 'CONFIRMED')).status).toBe(200);
    const delivered = await api.status(order.id, 'DELIVERED', 'SHIPPING');
    expect(delivered.status).toBe(200);

    const data = delivered.body.data;
    expect(data).toMatchObject({ status: 'DELIVERED', paymentStatus: 'PAID' });
    expect(data.paidAt).not.toBeNull();
    expect(data.payments).toEqual([
      expect.objectContaining({ method: 'COD', status: 'SUCCESS', amount: 100000, txnRef: null }),
    ]);
    expect(data.history.map((h: { toStatus: string }) => h.toStatus)).toEqual([
      'PENDING',
      'CONFIRMED',
      'SHIPPING',
      'DELIVERED',
    ]);
    expect(data.history[1]).toMatchObject({
      note: 'Đã gọi xác nhận',
      changedBy: { fullName: 'Admin Test', role: 'ADMIN' },
    });
    expect(data.history[0].changedBy).toMatchObject({ role: 'CUSTOMER' });
    expect(data.customer).toMatchObject({ id: customer.id, email: customer.email, isActive: true });

    // Khách thấy đơn đã giao
    const mine = await request(app)
      .get(`/api/me/orders/${order.id}`)
      .set('Authorization', customer.auth);
    expect(mine.body.data).toMatchObject({ status: 'DELIVERED', paymentStatus: 'PAID' });
  });

  it('sai luồng → 400 INVALID_STATUS_TRANSITION; trạng thái đã đổi → 409 ORDER_STATUS_CHANGED', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book);

    const skip = await api.status(order.id, 'SHIPPING', 'PENDING');
    expect(skip.status).toBe(400);
    expect(skip.body.error.code).toBe('INVALID_STATUS_TRANSITION');

    const stale = await api.status(order.id, 'SHIPPING', 'CONFIRMED');
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('ORDER_STATUS_CHANGED');

    await api.status(order.id, 'CONFIRMED', 'PENDING');
    expect((await api.status(order.id, 'CONFIRMED', 'CONFIRMED')).body.error.code).toBe(
      'INVALID_STATUS_TRANSITION',
    );

    await api.cancel(order.id, 'CONFIRMED');
    expect((await api.status(order.id, 'CONFIRMED', 'CANCELLED')).status).toBe(400);
    expect((await api.cancel(order.id, 'CANCELLED')).body.error.code).toBe(
      'INVALID_STATUS_TRANSITION',
    );
    expect((await api.status(999999, 'CONFIRMED', 'PENDING')).status).toBe(404);
    expect((await api.status(order.id, 'CANCELLED', 'PENDING')).status).toBe(422);
  });

  it('2 Admin cùng xác nhận song song → 1 thành công, 1 nhận 409', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book);

    const results = await Promise.all([
      api.status(order.id, 'CONFIRMED', 'PENDING'),
      api.status(order.id, 'CONFIRMED', 'PENDING'),
    ]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    const history = (await api.detail(order.id)).body.data.history;
    expect(history.filter((h: { toStatus: string }) => h.toStatus === 'CONFIRMED')).toHaveLength(1);
  });

  it('VNPay chưa thanh toán → không xác nhận được (PAYMENT_REQUIRED); đã thanh toán → được', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book, { method: 'VNPAY' });

    const res = await api.status(order.id, 'CONFIRMED', 'PENDING');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_REQUIRED');

    await markPaid(order.id);
    expect((await api.status(order.id, 'CONFIRMED', 'PENDING')).status).toBe(200);
  });
});

describe('Huỷ & hoàn tiền', () => {
  it('Admin huỷ (kể cả đang giao) → hoàn kho + log CANCEL, trừ đã bán, lịch sử, email lý do', async () => {
    const book = await createBook({ stock: 10 });
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book, { quantity: 3 });
    await api.status(order.id, 'CONFIRMED', 'PENDING');
    await api.status(order.id, 'SHIPPING', 'CONFIRMED');
    await flushEmails();
    sendMail.mockClear();

    const res = await api.cancel(order.id, 'SHIPPING', 'Giao hàng thất bại');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'CANCELLED',
      cancelReason: 'Giao hàng thất bại',
      paymentStatus: 'UNPAID',
    });
    expect(res.body.data.history.at(-1)).toMatchObject({
      fromStatus: 'SHIPPING',
      toStatus: 'CANCELLED',
      note: 'Cửa hàng huỷ: Giao hàng thất bại',
      changedBy: { role: 'ADMIN' },
    });
    expect(await bookStock(book)).toEqual({ stock: 10, soldCount: 0 });

    await flushEmails();
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('đã bị huỷ'),
        text: expect.stringContaining('Giao hàng thất bại'),
      }),
    );
    expect(sendMail.mock.calls[0][0].text).not.toContain('hoàn tiền');
  });

  it('huỷ đơn đã trả VNPay → Cần hoàn tiền → hoàn tiền → REFUNDED + email; đơn khác → ORDER_NOT_REFUNDABLE', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book, { method: 'VNPAY' });
    await markPaid(order.id);

    expect((await api.refund(order.id)).body.error.code).toBe('ORDER_NOT_REFUNDABLE');

    await api.cancel(order.id, 'PENDING', 'Khách yêu cầu huỷ');
    await flushEmails();
    expect(sendMail.mock.calls.at(-1)![0].text).toContain('hoàn tiền');

    expect((await api.summary()).body.data.counts).toMatchObject({ CANCELLED: 1, needsRefund: 1 });
    expect(
      (await api.list('?needsRefund=true')).body.data.map((o: { id: number }) => o.id),
    ).toEqual([order.id]);

    sendMail.mockClear();
    const refunded = await api.refund(order.id, 'Mã hoàn VNP999');
    expect(refunded.status).toBe(200);
    expect(refunded.body.data).toMatchObject({ status: 'CANCELLED', paymentStatus: 'REFUNDED' });
    expect(refunded.body.data.refundedAt).not.toBeNull();
    expect(refunded.body.data.history.at(-1).note).toBe('Đã hoàn tiền: Mã hoàn VNP999');
    await flushEmails();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('Đã hoàn tiền') }),
    );

    expect((await api.summary()).body.data.counts.needsRefund).toBe(0);
    expect((await api.refund(order.id)).body.error.code).toBe('ORDER_NOT_REFUNDABLE');
    expect((await api.refund(order.id, '')).status).toBe(422);
  });

  it('khách huỷ đúng lúc Admin xác nhận → chỉ 1 thao tác thắng', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book);

    const [confirm, cancel] = await Promise.all([
      api.status(order.id, 'CONFIRMED', 'PENDING'),
      request(app)
        .post(`/api/me/orders/${order.id}/cancel`)
        .set('Authorization', auth)
        .send({ reason: 'Đổi ý' }),
    ]);
    const statuses = [confirm.status, cancel.status];
    expect(statuses.filter((status) => status === 200)).toHaveLength(1);
    const final = (await api.detail(order.id)).body.data.status;
    expect(final).toBe(confirm.status === 200 ? 'CONFIRMED' : 'CANCELLED');
  });
});

describe('Danh sách & tìm kiếm', () => {
  it('lọc trạng thái / phương thức / thanh toán / ngày / khách; tìm mã, SĐT, tên không dấu, email; sắp xếp; đếm tab', async () => {
    const cheap = await createBook({ price: 10000, stock: 50 });
    const a = await newCustomer({ fullName: 'Trần Thị Bích' });
    const b = await newCustomer({ fullName: 'Lê Văn Cường' });
    const o1 = await placeOrder(a.auth, cheap, {
      price: 10000,
      recipientName: 'Trần Thị Bích',
      phone: '0981111111',
    });
    const o2 = await placeOrder(a.auth, cheap, {
      price: 10000,
      quantity: 5,
      method: 'VNPAY',
      recipientName: 'Trần Thị Bích',
      phone: '0981111111',
    });
    const o3 = await placeOrder(b.auth, cheap, {
      price: 10000,
      quantity: 2,
      recipientName: 'Lê Văn Cường',
      phone: '0972222222',
    });
    await api.status(o3.id, 'CONFIRMED', 'PENDING');
    // o1 đặt từ 3 ngày trước
    await pool.query(`UPDATE orders SET created_at = now() - interval '3 days' WHERE id = $1`, [
      o1.id,
    ]);

    const ids = async (query: string) =>
      (await api.list(query)).body.data.map((o: { id: number }) => o.id);

    const all = await api.list();
    expect(all.status).toBe(200);
    expect(all.body.meta.total).toBe(3);
    expect(all.body.data[0]).toMatchObject({
      id: o3.id,
      recipientPhone: '0972222222',
      itemCount: 2,
      customer: { id: b.id, fullName: 'Lê Văn Cường' },
    });

    expect(await ids('?status=CONFIRMED')).toEqual([o3.id]);
    expect(await ids('?paymentMethod=VNPAY')).toEqual([o2.id]);
    expect(await ids('?paymentStatus=UNPAID&sort=created_asc')).toEqual([o1.id, o2.id, o3.id]);
    expect(await ids('?sort=total_desc')).toEqual([o2.id, o3.id, o1.id]);
    expect(await ids(`?userId=${a.id}`)).toEqual([o2.id, o1.id]);
    expect(await ids(`?q=${o2.code.slice(-6)}`)).toEqual([o2.id]);
    expect(await ids('?q=0972')).toEqual([o3.id]);
    expect(await ids('?q=tran%20thi')).toEqual([o2.id, o1.id]);
    expect(await ids(`?q=${encodeURIComponent(b.email)}`)).toEqual([o3.id]);
    expect(await ids('?q=%25')).toEqual([]);

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
      new Date(),
    );
    expect(await ids(`?from=${today}&sort=created_asc`)).toEqual([o2.id, o3.id]);
    expect(await ids(`?to=${today}&sort=created_asc`)).toEqual([o1.id, o2.id, o3.id]);

    expect((await api.list('?limit=2&page=2')).body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
    expect((await api.summary()).body.data.counts).toEqual({
      PENDING: 2,
      CONFIRMED: 1,
      needsRefund: 0,
    });
    expect((await api.list('?status=XYZ')).status).toBe(422);
  });

  it('chi tiết: lượt thanh toán VNPay kèm câu giải thích mã phản hồi', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book, { method: 'VNPAY' });
    await pool.query(
      `INSERT INTO payments (order_id, method, amount, status, txn_ref, response_code)
       VALUES ($1, 'VNPAY', 50000, 'FAILED', $2, '24')`,
      [order.id, `${order.code}-1`],
    );
    const res = await api.detail(order.id);
    expect(res.body.data.payments).toEqual([
      expect.objectContaining({
        status: 'FAILED',
        txnRef: `${order.code}-1`,
        responseMessage: 'Bạn đã huỷ giao dịch',
      }),
    ]);
  });

  it('khách hàng gọi API Admin → 403', async () => {
    const { auth } = await newCustomer();
    expect((await request(app).get('/api/admin/orders').set('Authorization', auth)).status).toBe(
      403,
    );
  });
});
