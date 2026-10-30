import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import { loginAsAdmin, loginAsCustomer } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';

// M05 – Giỏ hàng (docs/03-modules/05-cart.md)

let customer: string;
let categoryId: number;

beforeEach(async () => {
  await resetDatabase();
  customer = await loginAsCustomer();
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO categories (name) VALUES ('Văn học') RETURNING id`,
  );
  categoryId = rows[0].id;
});

afterAll(async () => {
  await pool.end();
});

/** Tạo sách thẳng bằng SQL (nhanh — test giới hạn 50 đầu sách) */
async function createBook(
  title: string,
  { stock = 10, price = 50000, originalPrice = 60000, isActive = true, category = categoryId } = {},
) {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO books (title, category_id, original_price, price, stock, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [title, category, originalPrice, price, stock, isActive],
  );
  return rows[0].id;
}

const cart = (auth = customer) => ({
  get: () => request(app).get('/api/me/cart').set('Authorization', auth),
  add: (bookId: number, quantity = 1) =>
    request(app).post('/api/me/cart/items').set('Authorization', auth).send({ bookId, quantity }),
  set: (bookId: number, quantity: number) =>
    request(app)
      .patch(`/api/me/cart/items/${bookId}`)
      .set('Authorization', auth)
      .send({ quantity }),
  remove: (bookId: number) =>
    request(app).delete(`/api/me/cart/items/${bookId}`).set('Authorization', auth),
  clear: () => request(app).delete('/api/me/cart').set('Authorization', auth),
  merge: (items: object[]) =>
    request(app).post('/api/me/cart/merge').set('Authorization', auth).send({ items }),
});

const preview = (items: object[]) => request(app).post('/api/cart/preview').send({ items });

/** [bookId, quantity, issue] từng dòng */
const linesOf = (body: { items: { bookId: number; quantity: number; issue: string | null }[] }) =>
  body.items.map((item) => [item.bookId, item.quantity, item.issue]);

describe('Phân quyền', () => {
  it('giỏ tài khoản: chưa đăng nhập → 401, Admin → 403; xem trước giỏ khách: công khai', async () => {
    expect((await request(app).get('/api/me/cart')).status).toBe(401);
    const admin = await loginAsAdmin();
    expect((await cart(admin).get()).status).toBe(403);
    expect((await cart(admin).add(await createBook('A'))).status).toBe(403);
    expect((await preview([])).status).toBe(200);
  });
});

describe('Xem trước giỏ của khách', () => {
  it('giá hiện tại, thành tiền, tạm tính; dòng có vấn đề có nhãn & không tính tạm tính', async () => {
    const ok = await createBook('Đang bán', { price: 63200, originalPrice: 79000, stock: 42 });
    const hidden = await createBook('Đã ẩn', { isActive: false });
    const out = await createBook('Hết hàng', { stock: 0 });
    const few = await createBook('Còn 3', { stock: 3 });

    const res = await preview([
      { bookId: ok, quantity: 2 },
      { bookId: hidden, quantity: 1 },
      { bookId: out, quantity: 1 },
      { bookId: few, quantity: 5 },
      { bookId: 9999, quantity: 1 },
    ]);
    expect(res.status).toBe(200);
    expect(linesOf(res.body.data)).toEqual([
      [ok, 2, null],
      [hidden, 1, 'UNAVAILABLE'],
      [out, 1, 'OUT_OF_STOCK'],
      [few, 5, 'EXCEEDS_STOCK'],
    ]);
    expect(res.body.data.items[0]).toMatchObject({
      title: 'Đang bán',
      price: 63200,
      originalPrice: 79000,
      discountPercent: 20,
      maxQuantity: 42,
      lineTotal: 126400,
    });
    expect(res.body.data.items[3].maxQuantity).toBe(3);
    expect(res.body.data).toMatchObject({ totalQuantity: 9, subtotal: 126400, hasIssues: true });
    expect(res.body.data.items[0]).not.toHaveProperty('stock');
  });

  it('danh mục bị ẩn → sách ngừng kinh doanh; dòng trùng sách → cộng dồn', async () => {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO categories (name, is_active) VALUES ('Ẩn', false) RETURNING id`,
    );
    const inHidden = await createBook('Trong danh mục ẩn', { category: rows[0].id });
    const ok = await createBook('A');
    const res = await preview([
      { bookId: ok, quantity: 1 },
      { bookId: inHidden, quantity: 1 },
      { bookId: ok, quantity: 2 },
    ]);
    expect(linesOf(res.body.data)).toEqual([
      [ok, 3, null],
      [inHidden, 1, 'UNAVAILABLE'],
    ]);
  });

  it('dữ liệu sai → 422: số lượng 0 / > 99, quá 50 dòng', async () => {
    const id = await createBook('A');
    expect((await preview([{ bookId: id, quantity: 0 }])).status).toBe(422);
    expect((await preview([{ bookId: id, quantity: 100 }])).status).toBe(422);
    const many = Array.from({ length: 51 }, (_, i) => ({ bookId: i + 1, quantity: 1 }));
    expect((await preview(many)).status).toBe(422);
  });
});

describe('Giỏ của tài khoản', () => {
  it('thêm: cộng dồn; vượt tồn → giảm về tối đa + adjustment; mới nhất ở trên', async () => {
    const a = await createBook('A', { stock: 5 });
    const b = await createBook('B');

    expect((await cart().add(a, 2)).body.data.adjustment).toBeNull();
    await cart().add(b, 1);
    const res = await cart().add(a, 4);
    expect(res.status).toBe(200);
    expect(res.body.data.adjustment).toEqual({ bookId: a, requested: 6, quantity: 5 });
    expect(linesOf(res.body.data.cart)).toEqual([
      [b, 1, null],
      [a, 5, null],
    ]);
    expect(res.body.data.cart).toMatchObject({ totalQuantity: 6, subtotal: 300000 });
  });

  it('thêm sách ẩn → 400 BOOK_UNAVAILABLE; hết hàng → 409 OUT_OF_STOCK; không có → 400', async () => {
    const hidden = await createBook('Ẩn', { isActive: false });
    const out = await createBook('Hết', { stock: 0 });

    const res1 = await cart().add(hidden);
    expect(res1.status).toBe(400);
    expect(res1.body.error.code).toBe('BOOK_UNAVAILABLE');
    const res2 = await cart().add(out);
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('OUT_OF_STOCK');
    expect((await cart().add(9999)).status).toBe(400);
    expect((await cart().get()).body.data.items).toEqual([]);
  });

  it('tối đa 50 đầu sách → sách thứ 51: 409 CART_FULL; thêm sách đã có vẫn được', async () => {
    const ids: number[] = [];
    for (let i = 1; i <= 51; i += 1) ids.push(await createBook(`Sách ${i}`));
    for (const id of ids.slice(0, 50)) expect((await cart().add(id)).status).toBe(200);

    const res = await cart().add(ids[50]);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_FULL');
    expect((await cart().add(ids[0])).status).toBe(200);
  });

  it('5 lần thêm cùng lúc → cộng đủ 5 (khoá giỏ)', async () => {
    const id = await createBook('A');
    await Promise.all(Array.from({ length: 5 }, () => cart().add(id, 1)));
    expect(linesOf((await cart().get()).body.data)).toEqual([[id, 5, null]]);
  });

  it('sửa số lượng (vượt tồn → giảm), xoá 1, xoá tất cả; sách không có trong giỏ → 404', async () => {
    const a = await createBook('A', { stock: 3 });
    const b = await createBook('B');
    await cart().add(a);
    await cart().add(b);

    const set = await cart().set(a, 10);
    expect(set.status).toBe(200);
    expect(set.body.data.adjustment).toEqual({ bookId: a, requested: 10, quantity: 3 });

    const removed = await cart().remove(b);
    expect(removed.status).toBe(200);
    expect(linesOf(removed.body.data)).toEqual([[a, 3, null]]);
    expect((await cart().remove(b)).status).toBe(404);
    expect((await cart().set(b, 1)).status).toBe(404);

    expect((await cart().clear()).status).toBe(204);
    expect((await cart().get()).body.data).toMatchObject({
      items: [],
      totalQuantity: 0,
      subtotal: 0,
    });
  });

  it('sách trong giỏ bị ẩn / hết hàng sau đó → có nhãn, không tính tạm tính', async () => {
    const a = await createBook('A', { price: 10000 });
    const b = await createBook('B', { price: 20000 });
    await cart().add(a, 2);
    await cart().add(b, 1);
    await pool.query('UPDATE books SET is_active = false WHERE id = $1', [a]);

    const res = await cart().get();
    expect(linesOf(res.body.data)).toEqual([
      [b, 1, null],
      [a, 2, 'UNAVAILABLE'],
    ]);
    expect(res.body.data).toMatchObject({ subtotal: 20000, hasIssues: true });
    expect((await cart().set(a, 1)).status).toBe(400);
  });
});

describe('Gộp giỏ khi đăng nhập', () => {
  it('cộng dồn với giỏ tài khoản, giảm theo tồn, bỏ sách không hợp lệ; trả số dòng đã gộp', async () => {
    const a = await createBook('A', { stock: 4 });
    const b = await createBook('B');
    const hidden = await createBook('Ẩn', { isActive: false });
    const out = await createBook('Hết', { stock: 0 });
    await cart().add(a, 3);

    const res = await cart().merge([
      { bookId: a, quantity: 3 },
      { bookId: b, quantity: 2 },
      { bookId: hidden, quantity: 1 },
      { bookId: out, quantity: 1 },
      { bookId: 9999, quantity: 1 },
    ]);
    expect(res.status).toBe(200);
    expect(res.body.data.merged).toBe(2);
    const lines = linesOf(res.body.data.cart);
    expect(lines).toHaveLength(2);
    expect(lines).toEqual(
      expect.arrayContaining([
        [a, 4, null],
        [b, 2, null],
      ]),
    );
  });
});
