import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { loginAsAdmin } from '../helpers/admin';
import { bearer, createCustomer, getTokens, validRegisterBody } from '../helpers/auth';
import { resetDatabase } from '../helpers/db';

// M06 – Đặt hàng (docs/03-modules/06-order.md)

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

/** Tạo & đăng nhập 1 khách hàng mới → header Authorization */
async function newCustomer() {
  customerSeq += 1;
  const email = `kh${customerSeq}@gmail.com`;
  await createCustomer({
    ...validRegisterBody,
    email,
    phone: `09${String(customerSeq).padStart(8, '0')}`,
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: validRegisterBody.password });
  return bearer(getTokens(res).accessToken);
}

async function createBook(title: string, { stock = 10, price = 50000, isActive = true } = {}) {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO books (title, category_id, original_price, price, stock, is_active)
     VALUES ($1, $2, $3, $3, $4, $5) RETURNING id`,
    [title, categoryId, price, stock, isActive],
  );
  return rows[0].id;
}

const as = (auth: string) => ({
  addAddress: async () => {
    const res = await request(app).post('/api/me/addresses').set('Authorization', auth).send({
      recipientName: 'Nguyễn Văn A',
      phone: '0912345678',
      provinceCode: 1,
      province: 'Thành phố Hà Nội',
      wardCode: 4,
      ward: 'Phường Ba Đình',
      detail: '12 Hàng Bài',
    });
    return res.body.data.id as number;
  },
  addToCart: (bookId: number, quantity = 1) =>
    request(app).post('/api/me/cart/items').set('Authorization', auth).send({ bookId, quantity }),
  cart: () => request(app).get('/api/me/cart').set('Authorization', auth),
  order: (body: object, key: string | null = randomUUID()) => {
    const req = request(app).post('/api/me/orders').set('Authorization', auth);
    if (key) req.set('Idempotency-Key', key);
    return req.send(body);
  },
  list: (query = '') => request(app).get(`/api/me/orders${query}`).set('Authorization', auth),
  summary: () => request(app).get('/api/me/orders/summary').set('Authorization', auth),
  detail: (id: number) => request(app).get(`/api/me/orders/${id}`).set('Authorization', auth),
  cancel: (id: number, reason = 'Đổi ý') =>
    request(app).post(`/api/me/orders/${id}/cancel`).set('Authorization', auth).send({ reason }),
});

const bookRow = async (id: number) =>
  (
    await pool.query<{ stock: number; soldCount: number }>(
      'SELECT stock, sold_count AS "soldCount" FROM books WHERE id = $1',
      [id],
    )
  ).rows[0];

const vnYear = () =>
  new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric' }).format(
    new Date(),
  );

/** Khách hàng có địa chỉ + giỏ hàng sẵn → { auth, addressId } */
async function customerWithCart(lines: [bookId: number, quantity: number][]) {
  const auth = await newCustomer();
  const addressId = await as(auth).addAddress();
  for (const [bookId, quantity] of lines) await as(auth).addToCart(bookId, quantity);
  return { auth, addressId };
}

describe('Tạo đơn COD', () => {
  it('mã đơn, tiền, chụp lại sách & địa chỉ, trừ tồn + log, cộng đã bán, xoá giỏ, lịch sử, email', async () => {
    const a = await createBook('Nhà Giả Kim', { stock: 5, price: 63200 });
    const b = await createBook('Đắc Nhân Tâm', { stock: 3, price: 80000 });
    const { auth, addressId } = await customerWithCart([
      [a, 2],
      [b, 1],
    ]);

    const res = await as(auth).order({
      addressId,
      paymentMethod: 'COD',
      note: '  Giao giờ hành chính ',
      expectedTotal: 206400,
    });
    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order).toMatchObject({
      code: `BS-${vnYear()}-000001`,
      status: 'PENDING',
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      recipientName: 'Nguyễn Văn A',
      recipientPhone: '0912345678',
      shippingAddress: '12 Hàng Bài, Phường Ba Đình, Thành phố Hà Nội',
      note: 'Giao giờ hành chính',
      subtotal: 206400,
      shippingFee: 0,
      discountAmount: 0,
      total: 206400,
    });
    // Thứ tự như giỏ hàng: sách thêm sau ở trên
    expect(order.items).toEqual([
      expect.objectContaining({ bookId: b, title: 'Đắc Nhân Tâm', unitPrice: 80000, quantity: 1 }),
      expect.objectContaining({
        bookId: a,
        title: 'Nhà Giả Kim',
        unitPrice: 63200,
        quantity: 2,
        lineTotal: 126400,
      }),
    ]);
    expect(order.history).toEqual([
      expect.objectContaining({ fromStatus: null, toStatus: 'PENDING' }),
    ]);

    expect(await bookRow(a)).toEqual({ stock: 3, soldCount: 2 });
    expect(await bookRow(b)).toEqual({ stock: 2, soldCount: 1 });
    const logs = await pool.query(
      `SELECT book_id AS "bookId", change, stock_after AS "stockAfter", reason, order_id AS "orderId"
       FROM inventory_logs ORDER BY id`,
    );
    expect(logs.rows).toEqual([
      { bookId: b, change: -1, stockAfter: 2, reason: 'ORDER', orderId: order.id },
      { bookId: a, change: -2, stockAfter: 3, reason: 'ORDER', orderId: order.id },
    ]);
    expect((await as(auth).cart()).body.data.items).toEqual([]);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining(order.code) }),
    );

    // Đổi giá / sửa sổ địa chỉ sau đó không ảnh hưởng đơn đã đặt
    await pool.query('UPDATE books SET price = 1000, original_price = 1000 WHERE id = $1', [a]);
    await pool.query(`UPDATE addresses SET detail = 'Địa chỉ mới' WHERE id = $1`, [addressId]);
    const detail = (await as(auth).detail(order.id)).body.data;
    expect(detail.items.find((item: { bookId: number }) => item.bookId === a).unitPrice).toBe(
      63200,
    );
    expect(detail.shippingAddress).toContain('12 Hàng Bài');
  });

  it('lỗi: giỏ trống, giỏ có sách ngừng bán, địa chỉ người khác, tổng tiền lệch, thiếu khoá, ghi chú dài', async () => {
    const book = await createBook('A', { price: 10000 });
    const { auth, addressId } = await customerWithCart([]);
    const body = { addressId, paymentMethod: 'COD', expectedTotal: 10000 };

    const empty = await as(auth).order(body);
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('CART_EMPTY');

    await as(auth).addToCart(book);
    // VNPay chưa cấu hình → PAYMENT_METHOD_UNAVAILABLE: xem payment.api.test.ts (M07)

    const other = await newCustomer();
    const otherAddress = await as(other).addAddress();
    expect((await as(auth).order({ ...body, addressId: otherAddress })).status).toBe(404);

    const changed = await as(auth).order({ ...body, expectedTotal: 9000 });
    expect(changed.status).toBe(409);
    expect(changed.body.error.code).toBe('PRICE_CHANGED');

    expect((await as(auth).order(body, null)).status).toBe(422);
    expect((await as(auth).order(body, 'khong-phai-uuid')).status).toBe(422);
    expect((await as(auth).order({ ...body, note: 'x'.repeat(501) })).status).toBe(422);

    await pool.query('UPDATE books SET is_active = false WHERE id = $1', [book]);
    const hidden = await as(auth).order(body);
    expect(hidden.status).toBe(400);
    expect(hidden.body.error.code).toBe('CART_HAS_ISSUES');

    // Không có gì thay đổi sau các lần lỗi
    expect(await bookRow(book)).toEqual({ stock: 10, soldCount: 0 });
    expect((await pool.query('SELECT count(*)::int AS n FROM orders')).rows[0].n).toBe(0);
  });

  it('Admin không đặt hàng → 403', async () => {
    const admin = await loginAsAdmin();
    expect((await as(admin).list()).status).toBe(403);
    expect(
      (await as(admin).order({ addressId: 1, paymentMethod: 'COD', expectedTotal: 0 })).status,
    ).toBe(403);
  });
});

describe('Đặt hàng đồng thời', () => {
  it('2 khách cùng đặt cuốn chỉ còn 1 → đúng 1 đơn thành công, tồn kho không âm', async () => {
    const book = await createBook('Cuốn cuối', { stock: 1, price: 50000 });
    const first = await customerWithCart([[book, 1]]);
    const second = await customerWithCart([[book, 1]]);

    const results = await Promise.all(
      [first, second].map(({ auth, addressId }) =>
        as(auth).order({ addressId, paymentMethod: 'COD', expectedTotal: 50000 }),
      ),
    );
    expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
    const failed = results.find((res) => res.status === 409)!;
    expect(failed.body.error.code).toBe('OUT_OF_STOCK');
    expect(failed.body.error.details[0].message).toContain('hết hàng');
    expect(await bookRow(book)).toEqual({ stock: 0, soldCount: 1 });
  });

  it('5 đơn đồng thời → 5 mã liên tiếp, không trùng', async () => {
    const book = await createBook('A', { stock: 100, price: 10000 });
    const customers = await Promise.all(
      Array.from({ length: 5 }, () => customerWithCart([[book, 1]])),
    );
    const results = await Promise.all(
      customers.map(({ auth, addressId }) =>
        as(auth).order({ addressId, paymentMethod: 'COD', expectedTotal: 10000 }),
      ),
    );
    expect(results.every((res) => res.status === 201)).toBe(true);
    const codes = results.map((res) => res.body.data.code as string).sort();
    expect(codes).toEqual([1, 2, 3, 4, 5].map((n) => `BS-${vnYear()}-00000${n}`));
  });

  it('chống tạo trùng: cùng khoá (tuần tự & song song) → 1 đơn; khoá khác khi giỏ đã đặt → giỏ trống', async () => {
    const book = await createBook('A', { stock: 10, price: 10000 });
    const { auth, addressId } = await customerWithCart([[book, 2]]);
    const body = { addressId, paymentMethod: 'COD', expectedTotal: 20000 };
    const key = randomUUID();

    const [r1, r2] = await Promise.all([as(auth).order(body, key), as(auth).order(body, key)]);
    expect([r1.status, r2.status].sort()).toEqual([200, 201]);
    expect(r1.body.data.id).toBe(r2.body.data.id);

    const again = await as(auth).order(body, key);
    expect(again.status).toBe(200);
    expect(again.body.data.id).toBe(r1.body.data.id);

    expect((await as(auth).order(body, randomUUID())).body.error.code).toBe('CART_EMPTY');
    expect((await pool.query('SELECT count(*)::int AS n FROM orders')).rows[0].n).toBe(1);
    expect(await bookRow(book)).toEqual({ stock: 8, soldCount: 2 });
  });
});

describe('Huỷ đơn', () => {
  it('PENDING → huỷ: hoàn tồn + log CANCEL, trừ đã bán, lịch sử; huỷ lại / đã xác nhận → 400; đơn người khác → 404', async () => {
    const book = await createBook('A', { stock: 5, price: 10000 });
    const { auth, addressId } = await customerWithCart([[book, 3]]);
    const order = (await as(auth).order({ addressId, paymentMethod: 'COD', expectedTotal: 30000 }))
      .body.data;

    const other = await newCustomer();
    expect((await as(other).cancel(order.id)).status).toBe(404);

    const res = await as(auth).cancel(order.id, 'Đặt nhầm');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', cancelReason: 'Đặt nhầm' });
    expect(res.body.data.history.map((h: { toStatus: string }) => h.toStatus)).toEqual([
      'PENDING',
      'CANCELLED',
    ]);
    expect(await bookRow(book)).toEqual({ stock: 5, soldCount: 0 });
    const cancelLog = await pool.query(
      `SELECT change, stock_after AS "stockAfter" FROM inventory_logs WHERE reason = 'CANCEL'`,
    );
    expect(cancelLog.rows).toEqual([{ change: 3, stockAfter: 5 }]);

    const again = await as(auth).cancel(order.id);
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('ORDER_NOT_CANCELLABLE');

    // Đơn đã được Admin xác nhận (M08) → khách không huỷ được
    await as(auth).addToCart(book, 1);
    const second = (await as(auth).order({ addressId, paymentMethod: 'COD', expectedTotal: 10000 }))
      .body.data;
    await pool.query(`UPDATE orders SET status = 'CONFIRMED' WHERE id = $1`, [second.id]);
    expect((await as(auth).cancel(second.id)).status).toBe(400);
  });
});

describe('Đơn hàng của tôi', () => {
  it('danh sách mới nhất trước, lọc trạng thái, phân trang, xem nhanh 2 sách đầu; đếm theo trạng thái; chỉ đơn của mình', async () => {
    const books = await Promise.all(
      ['A', 'B', 'C'].map((title) => createBook(title, { price: 10000 })),
    );
    const { auth, addressId } = await customerWithCart([]);
    const ids: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      for (const book of books) await as(auth).addToCart(book, 1);
      const res = await as(auth).order({ addressId, paymentMethod: 'COD', expectedTotal: 30000 });
      ids.push(res.body.data.id);
    }
    await as(auth).cancel(ids[0]);

    const all = await as(auth).list('?limit=2');
    expect(all.status).toBe(200);
    expect(all.body.data.map((o: { id: number }) => o.id)).toEqual([ids[2], ids[1]]);
    expect(all.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(all.body.data[0]).toMatchObject({ itemCount: 3, moreCount: 1, total: 30000 });
    expect(all.body.data[0].previewItems).toHaveLength(2);

    const cancelled = await as(auth).list('?status=CANCELLED');
    expect(cancelled.body.data.map((o: { id: number }) => o.id)).toEqual([ids[0]]);

    expect((await as(auth).summary()).body.data).toEqual({
      counts: { PENDING: 2, CANCELLED: 1 },
    });

    const other = await newCustomer();
    expect((await as(other).list()).body.data).toEqual([]);
    expect((await as(other).detail(ids[1])).status).toBe(404);
    expect((await as(auth).list('?status=XYZ')).status).toBe(422);
  });
});
