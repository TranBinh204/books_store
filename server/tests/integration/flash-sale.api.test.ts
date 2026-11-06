import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { loginAsAdmin } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';
import { createBook, newCustomer, placeOrder } from '../helpers/shop';

// M12 – Flash Sale (docs/03-modules/12-promotion-flash-sale.md)

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

const HOUR = 60 * 60 * 1000;
const at = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

const saleBody = (items: object[], overrides: object = {}) => ({
  name: 'Flash Sale cuối tuần',
  startAt: at(-1),
  endAt: at(5),
  isActive: true,
  items,
  ...overrides,
});

const adminApi = {
  create: (body: object) =>
    request(app).post('/api/admin/flash-sales').set('Authorization', admin).send(body),
  update: (id: number, body: object) =>
    request(app).put(`/api/admin/flash-sales/${id}`).set('Authorization', admin).send(body),
  stop: (id: number) =>
    request(app).post(`/api/admin/flash-sales/${id}/stop`).set('Authorization', admin),
  remove: (id: number) =>
    request(app).delete(`/api/admin/flash-sales/${id}`).set('Authorization', admin),
  list: (query = '') =>
    request(app).get(`/api/admin/flash-sales${query}`).set('Authorization', admin),
  detail: (id: number) =>
    request(app).get(`/api/admin/flash-sales/${id}`).set('Authorization', admin),
};

async function createSale(items: object[], overrides: object = {}) {
  const res = await adminApi.create(saleBody(items, overrides));
  if (res.status !== 201) throw new Error(`Tạo flash sale lỗi: ${JSON.stringify(res.body)}`);
  return res.body.data as { id: number };
}

const current = () => request(app).get('/api/flash-sales/current');
const myCart = (auth: string) => request(app).get('/api/me/cart').set('Authorization', auth);
const addToCart = (auth: string, bookId: number, quantity: number) =>
  request(app).post('/api/me/cart/items').set('Authorization', auth).send({ bookId, quantity });
/** Đặt hàng từ giỏ hiện có (không thêm sách) — trả response */
async function checkout(auth: string, expectedTotal: number) {
  const address = await request(app).post('/api/me/addresses').set('Authorization', auth).send({
    recipientName: 'Nguyễn Văn A',
    phone: '0912345678',
    provinceCode: 1,
    province: 'Thành phố Hà Nội',
    wardCode: 4,
    ward: 'Phường Ba Đình',
    detail: '12 Hàng Bài',
  });
  return request(app)
    .post('/api/me/orders')
    .set('Authorization', auth)
    .set('Idempotency-Key', randomUUID())
    .send({ addressId: address.body.data.id, paymentMethod: 'COD', expectedTotal });
}

const sold = async (bookId: number) =>
  (
    await pool.query<{ sold: number }>('SELECT sold FROM flash_sale_items WHERE book_id = $1', [
      bookId,
    ])
  ).rows[0].sold;

describe('Flash Sale sắp diễn ra', () => {
  const upcoming = () => request(app).get('/api/flash-sales/upcoming');

  it('không có đợt nào sắp tới → null', async () => {
    const book = await createBook({ price: 60000 });
    await createSale([{ bookId: book, salePrice: 39000, quantity: 10 }]);
    const res = await upcoming();
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('trả đợt bật bắt đầu sớm nhất, không kèm giá sách; đợt tắt bị bỏ qua', async () => {
    const book = await createBook({ price: 60000 });
    const item = [{ bookId: book, salePrice: 39000, quantity: 10 }];
    await createSale(item, { name: 'Xa', startAt: at(30), endAt: at(40) });
    const near = await createSale(item, { name: 'Gần', startAt: at(10), endAt: at(20) });
    await createSale(item, { name: 'Tắt', startAt: at(2), endAt: at(5), isActive: false });

    const res = await upcoming();
    expect(res.body.data).toMatchObject({ id: near.id, name: 'Gần', itemCount: 1 });
    expect(res.body.data.items).toBeUndefined();
  });
});

describe('Giá Flash Sale trên cửa hàng', () => {
  it('không có chương trình đang chạy → current = null', async () => {
    const book = await createBook({ price: 60000 });
    await createSale([{ bookId: book, salePrice: 39000, quantity: 10 }], {
      startAt: at(2),
      endAt: at(5),
    });
    const res = await current();
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('đang chạy → current, thẻ sách & chi tiết có flashSale (price vẫn là giá thường)', async () => {
    const book = await createBook({ price: 60000 });
    const sale = await createSale([
      { bookId: book, salePrice: 39000, quantity: 10, perUserLimit: 2 },
    ]);

    const res = await current();
    expect(res.body.data).toMatchObject({ id: sale.id, name: 'Flash Sale cuối tuần' });
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0]).toMatchObject({
      id: book,
      price: 60000,
      flashSale: { salePrice: 39000, quantity: 10, sold: 0, perUserLimit: 2, discountPercent: 35 },
    });

    const list = await request(app).get('/api/books');
    expect(list.body.data[0].flashSale).toMatchObject({ salePrice: 39000 });
    const detail = await request(app).get(`/api/books/${book}`);
    expect(detail.body.data.flashSale).toMatchObject({ salePrice: 39000, sold: 0 });
  });

  it('chương trình tắt / hết giờ / giá sale ≥ giá bán hiện tại → giá thường', async () => {
    const book = await createBook({ price: 60000 });
    const sale = await createSale([{ bookId: book, salePrice: 39000, quantity: 10 }]);

    await pool.query('UPDATE books SET price = 39000 WHERE id = $1', [book]);
    expect((await request(app).get(`/api/books/${book}`)).body.data.flashSale).toBeNull();
    await pool.query('UPDATE books SET price = 60000 WHERE id = $1', [book]);

    await adminApi.stop(sale.id);
    expect((await request(app).get(`/api/books/${book}`)).body.data.flashSale).toBeNull();
    expect((await current()).body.data).toBeNull();
  });

  it('hết suất: thẻ sách về giá thường, chi tiết & khối Flash Sale vẫn hiện (xếp cuối)', async () => {
    const soldOut = await createBook({ price: 60000, title: 'Hết suất' });
    const other = await createBook({ price: 60000, title: 'Còn suất' });
    await createSale([
      { bookId: soldOut, salePrice: 30000, quantity: 1 },
      { bookId: other, salePrice: 50000, quantity: 5 },
    ]);
    const { auth } = await newCustomer();
    await placeOrder(auth, soldOut, { price: 30000 });

    const items = (await current()).body.data.items;
    expect(items.map((item: { id: number }) => item.id)).toEqual([other, soldOut]);
    const list = await request(app).get(`/api/books?q=${encodeURIComponent('Hết suất')}`);
    expect(list.body.data[0].flashSale).toBeNull();
    const detail = await request(app).get(`/api/books/${soldOut}`);
    expect(detail.body.data.flashSale).toMatchObject({ quantity: 1, sold: 1 });
  });
});

describe('Giỏ hàng & đặt hàng', () => {
  it('giỏ tính giá sale; đặt hàng chụp giá sale, giữ suất, dòng đơn có isFlashSale', async () => {
    const book = await createBook({ price: 60000, stock: 20 });
    await createSale([{ bookId: book, salePrice: 39000, quantity: 10, perUserLimit: 2 }]);
    const { auth } = await newCustomer();

    await addToCart(auth, book, 2);
    const cart = await myCart(auth);
    expect(cart.body.data).toMatchObject({ subtotal: 78000, hasIssues: false });
    expect(cart.body.data.items[0]).toMatchObject({
      price: 39000,
      lineTotal: 78000,
      issue: null,
      flashSale: { perUserLimit: 2, allowed: 2 },
    });

    const res = await checkout(auth, 78000);
    expect(res.status).toBe(201);
    const order = res.body.data;
    expect(order.total).toBe(78000);
    expect(await sold(book)).toBe(2);
    const detail = await request(app).get(`/api/me/orders/${order.id}`).set('Authorization', auth);
    expect(detail.body.data.items[0]).toMatchObject({ unitPrice: 39000, isFlashSale: true });
  });

  it('vượt giới hạn / người → dòng giỏ FLASH_SALE_LIMIT; đặt hàng → 409', async () => {
    const book = await createBook({ price: 60000, stock: 20 });
    await createSale([{ bookId: book, salePrice: 39000, quantity: 10, perUserLimit: 2 }]);
    const { auth } = await newCustomer();

    await addToCart(auth, book, 3);
    const cart = await myCart(auth);
    expect(cart.body.data.items[0]).toMatchObject({ issue: 'FLASH_SALE_LIMIT', price: 39000 });
    expect(cart.body.data).toMatchObject({ subtotal: 0, hasIssues: true });

    const res = await checkout(auth, 39000 * 3);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FLASH_SALE_LIMIT');
    expect(await sold(book)).toBe(0);
  });

  it('đã mua hết lượt giá sale → lần sau giá thường; huỷ đơn → được mua giá sale lại', async () => {
    const book = await createBook({ price: 60000, stock: 20 });
    await createSale([{ bookId: book, salePrice: 39000, quantity: 10, perUserLimit: 1 }]);
    const { auth } = await newCustomer();

    const first = await placeOrder(auth, book, { price: 39000 });
    await addToCart(auth, book, 1);
    expect((await myCart(auth)).body.data.items[0]).toMatchObject({
      price: 60000,
      flashSale: null,
      issue: null,
    });

    await request(app)
      .post(`/api/me/orders/${first.id}/cancel`)
      .set('Authorization', auth)
      .send({ reason: 'Đổi ý' });
    expect(await sold(book)).toBe(0);
    expect((await myCart(auth)).body.data.items[0]).toMatchObject({ price: 39000 });
  });

  it('không đủ suất cho số lượng → giá thường; client gửi tổng theo giá sale → PRICE_CHANGED', async () => {
    const book = await createBook({ price: 60000, stock: 20 });
    await createSale([{ bookId: book, salePrice: 39000, quantity: 1, perUserLimit: 5 }]);
    const { auth } = await newCustomer();

    await addToCart(auth, book, 2);
    expect((await myCart(auth)).body.data.items[0]).toMatchObject({ price: 60000 });
    const res = await checkout(auth, 39000 * 2);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PRICE_CHANGED');
    expect((await checkout(auth, 120000)).status).toBe(201);
    expect(await sold(book)).toBe(0);
  });

  it('2 khách tranh suất cuối → chỉ 1 người được giá sale', async () => {
    const book = await createBook({ price: 60000, stock: 20 });
    await createSale([{ bookId: book, salePrice: 39000, quantity: 1 }]);
    const customers = await Promise.all([newCustomer(), newCustomer()]);
    const results = await Promise.allSettled(
      customers.map((c) => placeOrder(c.auth, book, { price: 39000 })),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(String(failed.reason)).toContain('PRICE_CHANGED');
    expect(await sold(book)).toBe(1);
  });

  it('voucher dùng chung: tính trên tạm tính giá sale', async () => {
    const book = await createBook({ price: 100000, stock: 20 });
    await createSale([{ bookId: book, salePrice: 80000, quantity: 10, perUserLimit: 2 }]);
    await request(app)
      .post('/api/admin/vouchers')
      .set('Authorization', admin)
      .send({
        code: 'GIAM10',
        discountType: 'PERCENT',
        discountValue: 10,
        startAt: at(-1),
        endAt: at(24),
      });
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book, {
      quantity: 2,
      price: 80000,
      voucherCode: 'GIAM10',
      discount: 16000,
    });
    expect(order.total).toBe(144000);
  });
});

describe('Admin', () => {
  it('chồng giờ chương trình đang bật → 409 FLASH_SALE_OVERLAP; chương trình tắt thì được', async () => {
    const book = await createBook({ price: 60000 });
    await createSale([{ bookId: book, salePrice: 39000, quantity: 10 }]);
    const item = { bookId: book, salePrice: 40000, quantity: 5 };

    const overlap = await adminApi.create(saleBody([item], { startAt: at(2), endAt: at(8) }));
    expect(overlap.status).toBe(409);
    expect(overlap.body.error.code).toBe('FLASH_SALE_OVERLAP');
    expect(overlap.body.error.message).toContain('Flash Sale cuối tuần');

    const off = await adminApi.create(
      saleBody([item], { startAt: at(2), endAt: at(8), isActive: false }),
    );
    expect(off.status).toBe(201);
    // Nối tiếp ngay sau chương trình kia: không chồng
    const next = await adminApi.create(saleBody([item], { startAt: at(5), endAt: at(8) }));
    expect(next.status).toBe(201);
  });

  it('giá sale ≥ giá bán, sách trùng, kết thúc ≤ bắt đầu → 422', async () => {
    const book = await createBook({ price: 60000 });
    const price = await adminApi.create(
      saleBody([{ bookId: book, salePrice: 60000, quantity: 5 }]),
    );
    expect(price.status).toBe(422);
    expect(price.body.error.details[0].field).toBe('items.0.salePrice');

    const dup = await adminApi.create(
      saleBody([
        { bookId: book, salePrice: 30000, quantity: 5 },
        { bookId: book, salePrice: 30000, quantity: 5 },
      ]),
    );
    expect(dup.status).toBe(422);

    const time = await adminApi.create(
      saleBody([{ bookId: book, salePrice: 30000, quantity: 5 }], { endAt: at(-2) }),
    );
    expect(time.status).toBe(422);
  });

  it('danh sách: trạng thái, đã bán, doanh thu', async () => {
    const book = await createBook({ price: 60000, stock: 20 });
    await createSale([{ bookId: book, salePrice: 39000, quantity: 10 }]);
    await createSale([{ bookId: book, salePrice: 40000, quantity: 3 }], {
      name: 'Sắp tới',
      startAt: at(10),
      endAt: at(20),
    });
    const { auth } = await newCustomer();
    await placeOrder(auth, book, { price: 39000 });

    const res = await adminApi.list();
    expect(res.body.data).toHaveLength(2);
    expect(
      res.body.data.find((s: { name: string }) => s.name === 'Flash Sale cuối tuần'),
    ).toMatchObject({
      status: 'ACTIVE',
      itemCount: 1,
      totalQuantity: 10,
      totalSold: 1,
      revenue: 39000,
      orderCount: 1,
    });
    const upcoming = await adminApi.list('?status=UPCOMING');
    expect(upcoming.body.data.map((s: { name: string }) => s.name)).toEqual(['Sắp tới']);
  });

  it('đã có đơn: khoá giá / giới hạn / xoá sách & giờ bắt đầu; được sửa tên, giờ kết thúc, số suất, thêm sách', async () => {
    const book = await createBook({ price: 60000, stock: 20 });
    const extra = await createBook({ price: 80000 });
    const body = saleBody([{ bookId: book, salePrice: 39000, quantity: 10, perUserLimit: 1 }]);
    const sale = await createSale(body.items);
    const { auth } = await newCustomer();
    await placeOrder(auth, book, { price: 39000 });

    const price = await adminApi.update(sale.id, {
      ...body,
      items: [{ bookId: book, salePrice: 35000, quantity: 10, perUserLimit: 1 }],
    });
    expect(price.status).toBe(409);
    expect(price.body.error.code).toBe('FLASH_SALE_LOCKED');

    const removeBook = await adminApi.update(sale.id, {
      ...body,
      items: [{ bookId: extra, salePrice: 50000, quantity: 5 }],
    });
    expect(removeBook.status).toBe(409);

    const start = await adminApi.update(sale.id, { ...body, startAt: at(-2) });
    expect(start.status).toBe(409);

    const ok = await adminApi.update(sale.id, {
      ...body,
      name: 'Gia hạn',
      endAt: at(10),
      items: [
        { bookId: book, salePrice: 39000, quantity: 20, perUserLimit: 1 },
        { bookId: extra, salePrice: 50000, quantity: 5, perUserLimit: 2 },
      ],
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ name: 'Gia hạn', itemCount: 2, totalQuantity: 25 });
    expect(ok.body.data.items[0]).toMatchObject({ sold: 1, orderCount: 1 });
  });

  it('số suất vượt tồn kho → 422 (sửa: tính trên suất còn lại, chỉ khi tăng suất)', async () => {
    const book = await createBook({ price: 60000, stock: 5 });
    const over = await adminApi.create(saleBody([{ bookId: book, salePrice: 39000, quantity: 6 }]));
    expect(over.status).toBe(422);
    expect(over.body.error.details[0]).toMatchObject({
      field: 'items.0.quantity',
      message: expect.stringContaining('chỉ còn 5 cuốn'),
    });

    const body = saleBody([{ bookId: book, salePrice: 39000, quantity: 5, perUserLimit: 2 }]);
    const sale = await createSale(body.items);
    const { auth } = await newCustomer();
    await placeOrder(auth, book, { quantity: 2, price: 39000 }); // tồn còn 3, đã bán 2

    // Giữ nguyên số suất (đã bán 2 + còn 3 = tồn 3) → được
    expect((await adminApi.update(sale.id, { ...body, name: 'Đổi tên' })).status).toBe(200);
    // Tăng lên 6 → suất còn lại 4 > tồn 3
    const more = await adminApi.update(sale.id, {
      ...body,
      items: [{ bookId: book, salePrice: 39000, quantity: 6, perUserLimit: 2 }],
    });
    expect(more.status).toBe(422);
    expect(more.body.error.details[0].message).toContain('tối đa 5 suất');
  });

  it('số suất nhỏ hơn đã bán → 422', async () => {
    const book = await createBook({ price: 60000, stock: 20 });
    const body = saleBody([{ bookId: book, salePrice: 39000, quantity: 10, perUserLimit: 5 }]);
    const sale = await createSale(body.items);
    const { auth } = await newCustomer();
    await placeOrder(auth, book, { quantity: 3, price: 39000 });

    const res = await adminApi.update(sale.id, {
      ...body,
      items: [{ bookId: book, salePrice: 39000, quantity: 2, perUserLimit: 5 }],
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details[0].field).toBe('items.0.quantity');
  });

  it('xoá: chưa có đơn → 204; có đơn (kể cả đã huỷ) → 409, chỉ dừng được', async () => {
    const book = await createBook({ price: 60000, stock: 20 });
    const empty = await createSale([{ bookId: book, salePrice: 39000, quantity: 10 }], {
      startAt: at(10),
      endAt: at(20),
    });
    expect((await adminApi.remove(empty.id)).status).toBe(204);

    const sale = await createSale([{ bookId: book, salePrice: 39000, quantity: 10 }]);
    const { auth } = await newCustomer();
    const order = await placeOrder(auth, book, { price: 39000 });
    await request(app)
      .post(`/api/me/orders/${order.id}/cancel`)
      .set('Authorization', auth)
      .send({ reason: 'Đổi ý' });

    const res = await adminApi.remove(sale.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FLASH_SALE_LOCKED');

    const stop = await adminApi.stop(sale.id);
    expect(stop.status).toBe(200);
    expect(stop.body.data).toMatchObject({ isActive: false, status: 'DISABLED' });
  });

  it('khách không gọi được API Admin', async () => {
    const { auth } = await newCustomer();
    const res = await request(app).get('/api/admin/flash-sales').set('Authorization', auth);
    expect(res.status).toBe(403);
  });
});
