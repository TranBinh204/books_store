import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../../src/app';
import { env } from '../../src/config/env';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { sign, signData, type VnpParams } from '../../src/lib/vnpay';
import { expireUnpaidOrders } from '../../src/services/order.service';
import { bearer, createCustomer, getTokens, validRegisterBody } from '../helpers/auth';
import { resetDatabase } from '../helpers/db';

// M07 – Thanh toán VNPay (docs/03-modules/07-payment.md)

jest.mock('../../src/lib/mailer');
const sendMail = jest.mocked(mailer.sendMail);

let categoryId: number;

beforeEach(async () => {
  await resetDatabase();
  jest.clearAllMocks();
  sendMail.mockResolvedValue(undefined);
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO categories (name) VALUES ('Văn học') RETURNING id`,
  );
  categoryId = rows[0].id;
});

afterAll(async () => {
  await pool.end();
});

let customerSeq = 0;

async function newCustomer() {
  customerSeq += 1;
  const email = `pay${customerSeq}@gmail.com`;
  await createCustomer({
    ...validRegisterBody,
    email,
    phone: `08${String(customerSeq).padStart(8, '0')}`,
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: validRegisterBody.password });
  return bearer(getTokens(res).accessToken);
}

async function createBook(stock = 10, price = 50000) {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO books (title, category_id, original_price, price, stock, is_active)
     VALUES ('Nhà Giả Kim', $1, $2, $2, $3, true) RETURNING id`,
    [categoryId, price, stock],
  );
  return rows[0].id;
}

const bookStock = async (id: number) =>
  (
    await pool.query<{ stock: number; soldCount: number }>(
      'SELECT stock, sold_count AS "soldCount" FROM books WHERE id = $1',
      [id],
    )
  ).rows[0];

/** KH mới, có địa chỉ, giỏ `quantity` cuốn `bookId` → đặt đơn với phương thức `method` */
async function placeOrder(
  bookId: number,
  quantity: number,
  method: 'COD' | 'VNPAY',
  price = 50000,
) {
  const auth = await newCustomer();
  const address = await request(app).post('/api/me/addresses').set('Authorization', auth).send({
    recipientName: 'Nguyễn Văn A',
    phone: '0912345678',
    provinceCode: 1,
    province: 'Thành phố Hà Nội',
    wardCode: 4,
    ward: 'Phường Ba Đình',
    detail: '12 Hàng Bài',
  });
  await request(app)
    .post('/api/me/cart/items')
    .set('Authorization', auth)
    .send({ bookId, quantity });
  const res = await request(app)
    .post('/api/me/orders')
    .set('Authorization', auth)
    .set('Idempotency-Key', randomUUID())
    .send({
      addressId: address.body.data.id,
      paymentMethod: method,
      expectedTotal: price * quantity,
    });
  return { auth, res, order: res.body.data };
}

const api = (auth: string) => ({
  payUrl: (orderId: number) =>
    request(app).post(`/api/me/orders/${orderId}/vnpay`).set('Authorization', auth),
  detail: (orderId: number) =>
    request(app).get(`/api/me/orders/${orderId}`).set('Authorization', auth),
  cancel: (orderId: number) =>
    request(app)
      .post(`/api/me/orders/${orderId}/cancel`)
      .set('Authorization', auth)
      .send({ reason: 'Đổi ý' }),
});

/** Tạo link thanh toán → trả các tham số đã ký trong URL */
async function createPayment(auth: string, orderId: number) {
  const res = await api(auth).payUrl(orderId);
  expect(res.status).toBe(200);
  return Object.fromEntries(new URL(res.body.data.paymentUrl).searchParams) as VnpParams;
}

/** Dựng bộ tham số IPN / Return như VNPay gửi về (đã ký bằng khoá test) */
function vnpayCallback(
  payment: VnpParams,
  overrides: Partial<VnpParams> = {},
  secret = env.VNPAY_HASH_SECRET!,
): string {
  const params: VnpParams = {
    vnp_TmnCode: payment.vnp_TmnCode,
    vnp_Amount: payment.vnp_Amount,
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: 'VNP14567890',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: payment.vnp_OrderInfo,
    vnp_PayDate: '20261005143500',
    vnp_ResponseCode: '00',
    vnp_TransactionNo: '14567890',
    vnp_TransactionStatus: '00',
    vnp_TxnRef: payment.vnp_TxnRef,
    ...overrides,
  };
  return `${signData(params)}&vnp_SecureHash=${sign(params, secret)}`;
}

const ipn = (query: string) => request(app).get(`/api/payments/vnpay/ipn?${query}`);
const vnpReturn = (query: string) => request(app).get(`/api/payments/vnpay/return?${query}`);

const paymentRows = async (orderId: number) =>
  (
    await pool.query(
      `SELECT status, txn_ref AS "txnRef", amount, response_code AS "responseCode",
         provider_txn_no AS "providerTxnNo", paid_at IS NOT NULL AS "hasPaidAt"
       FROM payments WHERE order_id = $1 ORDER BY id`,
      [orderId],
    )
  ).rows;

describe('Phương thức thanh toán', () => {
  it('GET /payments/methods: COD & VNPay đang nhận; VNPay tắt khi chưa cấu hình', async () => {
    const res = await request(app).get('/api/payments/methods');
    expect(res.body.data).toEqual([
      { code: 'COD', available: true },
      { code: 'VNPAY', available: true },
    ]);

    env.vnpayEnabled = false;
    try {
      const methods = await request(app).get('/api/payments/methods');
      expect(methods.body.data[1]).toEqual({ code: 'VNPAY', available: false });
      const book = await createBook();
      const { res: order } = await placeOrder(book, 1, 'VNPAY');
      expect(order.status).toBe(400);
      expect(order.body.error.code).toBe('PAYMENT_METHOD_UNAVAILABLE');
    } finally {
      env.vnpayEnabled = true;
    }
  });
});

describe('Đặt đơn VNPay & tạo link thanh toán', () => {
  it('đơn PENDING + UNPAID, có hạn thanh toán, đã giữ hàng, chưa gửi email; link đúng tham số & chữ ký', async () => {
    const book = await createBook(5);
    const { auth, res, order } = await placeOrder(book, 2, 'VNPAY');
    expect(res.status).toBe(201);
    expect(order).toMatchObject({
      paymentMethod: 'VNPAY',
      paymentStatus: 'UNPAID',
      status: 'PENDING',
      total: 100000,
      paidAt: null,
    });
    const dueInMinutes = (new Date(order.paymentDueAt).getTime() - Date.now()) / 60000;
    expect(dueInMinutes).toBeGreaterThan(env.VNPAY_PAYMENT_TTL_MINUTES - 1);
    expect(dueInMinutes).toBeLessThanOrEqual(env.VNPAY_PAYMENT_TTL_MINUTES);
    expect(await bookStock(book)).toEqual({ stock: 3, soldCount: 2 });
    expect(sendMail).not.toHaveBeenCalled();

    const payment = await createPayment(auth, order.id);
    expect(payment).toMatchObject({
      vnp_TmnCode: env.VNPAY_TMN_CODE,
      vnp_Amount: '10000000',
      vnp_TxnRef: `${order.code}-1`,
      vnp_ReturnUrl: env.VNPAY_RETURN_URL,
    });
    expect(await paymentRows(order.id)).toEqual([
      expect.objectContaining({ status: 'PENDING', txnRef: `${order.code}-1`, amount: 100000 }),
    ]);

    // Lượt thử thứ 2 → txn_ref mới
    expect((await createPayment(auth, order.id)).vnp_TxnRef).toBe(`${order.code}-2`);
  });

  it('lỗi: đơn COD, đơn người khác, đơn đã huỷ, quá hạn', async () => {
    const book = await createBook();
    const cod = await placeOrder(book, 1, 'COD');
    const codRes = await api(cod.auth).payUrl(cod.order.id);
    expect(codRes.status).toBe(400);
    expect(codRes.body.error.code).toBe('ORDER_NOT_PAYABLE');

    const { auth, order } = await placeOrder(book, 1, 'VNPAY');
    expect((await api(cod.auth).payUrl(order.id)).status).toBe(404);

    await pool.query(
      `UPDATE orders SET payment_due_at = now() - interval '1 minute' WHERE id = $1`,
      [order.id],
    );
    const expired = await api(auth).payUrl(order.id);
    expect(expired.status).toBe(400);
    expect(expired.body.error.code).toBe('PAYMENT_EXPIRED');

    await api(auth).cancel(order.id);
    expect((await api(auth).payUrl(order.id)).body.error.code).toBe('ORDER_NOT_PAYABLE');
  });
});

describe('IPN', () => {
  it('chữ ký sai 97 · txn lạ 01 · sai số tiền 04 · thành công 00 → PAID + lịch sử + email · gửi lại 02', async () => {
    const book = await createBook();
    const { auth, order } = await placeOrder(book, 1, 'VNPAY');
    const payment = await createPayment(auth, order.id);

    expect((await ipn(vnpayCallback(payment, {}, 'khoa-sai'))).body).toEqual({
      RspCode: '97',
      Message: 'Invalid signature',
    });
    expect(
      (await ipn(vnpayCallback(payment, { vnp_TxnRef: 'BS-0000-000000-9' }))).body.RspCode,
    ).toBe('01');
    expect((await ipn(vnpayCallback(payment, { vnp_Amount: '100' }))).body.RspCode).toBe('04');
    expect((await api(auth).detail(order.id)).body.data.paymentStatus).toBe('UNPAID');

    const ok = await ipn(vnpayCallback(payment));
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ RspCode: '00', Message: 'Confirm Success' });

    const detail = (await api(auth).detail(order.id)).body.data;
    expect(detail).toMatchObject({ status: 'PENDING', paymentStatus: 'PAID' });
    expect(detail.paidAt).not.toBeNull();
    expect(detail.history.at(-1).note).toContain('Đã thanh toán VNPay');
    expect(await paymentRows(order.id)).toEqual([
      {
        status: 'SUCCESS',
        txnRef: `${order.code}-1`,
        amount: 50000,
        responseCode: '00',
        providerTxnNo: '14567890',
        hasPaidAt: true,
      },
    ]);
    // Email xác nhận gửi sau khi thanh toán (gửi không chờ)
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('đã thanh toán') }),
    );

    // VNPay gửi lại IPN → 02, không cập nhật / không gửi email lần 2
    expect((await ipn(vnpayCallback(payment))).body.RspCode).toBe('02');
    expect(sendMail).toHaveBeenCalledTimes(1);

    // Đã thanh toán → không tạo link nữa, không tự huỷ được
    expect((await api(auth).payUrl(order.id)).body.error.code).toBe('ORDER_NOT_PAYABLE');
    const cancel = await api(auth).cancel(order.id);
    expect(cancel.status).toBe(400);
    expect(cancel.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('2 IPN thành công gửi đồng thời → cập nhật đúng 1 lần', async () => {
    const book = await createBook();
    const { auth, order } = await placeOrder(book, 1, 'VNPAY');
    const query = vnpayCallback(await createPayment(auth, order.id));

    const results = await Promise.all([ipn(query), ipn(query), ipn(query)]);
    expect(results.map((res) => res.body.RspCode).sort()).toEqual(['00', '02', '02']);
    const history = (await api(auth).detail(order.id)).body.data.history;
    expect(history.filter((h: { note: string }) => h.note?.includes('VNPay'))).toHaveLength(1);
  });

  it('thất bại (khách huỷ 24) → FAILED, vẫn PENDING → thanh toán lại thành công', async () => {
    const book = await createBook();
    const { auth, order } = await placeOrder(book, 1, 'VNPAY');
    const first = await createPayment(auth, order.id);

    const failed = await ipn(
      vnpayCallback(first, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }),
    );
    expect(failed.body.RspCode).toBe('00');
    expect((await api(auth).detail(order.id)).body.data).toMatchObject({
      status: 'PENDING',
      paymentStatus: 'FAILED',
    });

    const second = await createPayment(auth, order.id);
    expect((await ipn(vnpayCallback(second))).body.RspCode).toBe('00');
    expect((await api(auth).detail(order.id)).body.data.paymentStatus).toBe('PAID');
    expect((await paymentRows(order.id)).map((p) => p.status)).toEqual(['FAILED', 'SUCCESS']);
  });

  it('tiền về sau khi đơn đã huỷ → 00, đơn CANCELLED + PAID (cần hoàn tiền), không gửi email', async () => {
    const book = await createBook();
    const { auth, order } = await placeOrder(book, 1, 'VNPAY');
    const payment = await createPayment(auth, order.id);
    await api(auth).cancel(order.id);

    expect((await ipn(vnpayCallback(payment))).body.RspCode).toBe('00');
    const detail = (await api(auth).detail(order.id)).body.data;
    expect(detail).toMatchObject({ status: 'CANCELLED', paymentStatus: 'PAID' });
    expect(detail.history.at(-1).note).toContain('cần hoàn tiền');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe('Return URL', () => {
  it('chữ ký đúng → kết quả để hiển thị, KHÔNG ghi DB; chữ ký sai → 422', async () => {
    const book = await createBook();
    const { auth, order } = await placeOrder(book, 1, 'VNPAY');
    const payment = await createPayment(auth, order.id);

    const res = await vnpReturn(vnpayCallback(payment));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      orderId: order.id,
      orderCode: order.code,
      success: true,
      responseCode: '00',
      amount: 50000,
      transactionNo: '14567890',
    });
    expect((await api(auth).detail(order.id)).body.data.paymentStatus).toBe('UNPAID');
    expect((await paymentRows(order.id))[0].status).toBe('PENDING');

    const cancelled = await vnpReturn(
      vnpayCallback(payment, { vnp_ResponseCode: '24', vnp_TransactionStatus: '02' }),
    );
    expect(cancelled.body.data).toMatchObject({ success: false, message: 'Bạn đã huỷ giao dịch' });

    const bad = await vnpReturn(vnpayCallback(payment, {}, 'khoa-sai'));
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe('INVALID_SIGNATURE');
  });

  it('chế độ dev VNPAY_IPN_FROM_RETURN → Return URL cập nhật như IPN', async () => {
    const book = await createBook();
    const { auth, order } = await placeOrder(book, 1, 'VNPAY');
    const payment = await createPayment(auth, order.id);

    env.VNPAY_IPN_FROM_RETURN = true;
    try {
      expect((await vnpReturn(vnpayCallback(payment))).status).toBe(200);
    } finally {
      env.VNPAY_IPN_FROM_RETURN = false;
    }
    expect((await api(auth).detail(order.id)).body.data.paymentStatus).toBe('PAID');
    // IPN thật đến sau → 02
    expect((await ipn(vnpayCallback(payment))).body.RspCode).toBe('02');
  });
});

describe('Job tự huỷ đơn quá hạn thanh toán', () => {
  it('huỷ đơn VNPay chưa trả đã quá hạn + grace, hoàn kho; bỏ qua đơn còn hạn / đã trả / COD', async () => {
    const book = await createBook(10);
    const overdue = await placeOrder(book, 2, 'VNPAY');
    const inGrace = await placeOrder(book, 1, 'VNPAY');
    const paid = await placeOrder(book, 1, 'VNPAY');
    const cod = await placeOrder(book, 1, 'COD');
    expect(await bookStock(book)).toEqual({ stock: 5, soldCount: 5 });

    expect(
      (await ipn(vnpayCallback(await createPayment(paid.auth, paid.order.id)))).body.RspCode,
    ).toBe('00');
    const grace = env.VNPAY_CANCEL_GRACE_MINUTES;
    await pool.query(
      `UPDATE orders SET payment_due_at = now() - make_interval(mins => $2::int + 1) WHERE id = ANY($1)`,
      [[overdue.order.id, paid.order.id, cod.order.id], grace],
    );
    await pool.query(
      `UPDATE orders SET payment_due_at = now() - make_interval(secs => 30) WHERE id = $1`,
      [inGrace.order.id],
    );

    expect(await expireUnpaidOrders()).toBe(1);

    const expired = (await api(overdue.auth).detail(overdue.order.id)).body.data;
    expect(expired).toMatchObject({ status: 'CANCELLED', cancelReason: 'Quá hạn thanh toán' });
    expect(expired.history.at(-1)).toMatchObject({ toStatus: 'CANCELLED' });
    expect(await bookStock(book)).toEqual({ stock: 7, soldCount: 3 });

    for (const { auth, order } of [inGrace, paid, cod]) {
      expect((await api(auth).detail(order.id)).body.data.status).toBe('PENDING');
    }
    expect(await expireUnpaidOrders()).toBe(0);
  });
});
