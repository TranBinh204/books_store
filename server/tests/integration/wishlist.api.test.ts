import request from 'supertest';
import { app } from '../../src/app';
import { env } from '../../src/config/env';
import { pool } from '../../src/db/pool';
import { loginAsAdmin } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';
import { createBook, newCustomer } from '../helpers/shop';

// M09 – Sách yêu thích (docs/03-modules/09-wishlist.md)

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});

const api = (auth: string) => ({
  list: (query = '') => request(app).get(`/api/me/wishlist${query}`).set('Authorization', auth),
  ids: () => request(app).get('/api/me/wishlist/ids').set('Authorization', auth),
  add: (bookId: number) =>
    request(app).put(`/api/me/wishlist/${bookId}`).set('Authorization', auth),
  remove: (bookId: number) =>
    request(app).delete(`/api/me/wishlist/${bookId}`).set('Authorization', auth),
});

const idsOf = async (auth: string) => (await api(auth).ids()).body.data.bookIds as number[];

describe('Thêm / bỏ', () => {
  it('thêm → có trong danh sách & ids; thêm lại không nhân đôi; bỏ → 204; bỏ sách không có → 204', async () => {
    const book = await createBook({ title: 'Nhà Giả Kim', price: 63200 });
    const { auth } = await newCustomer();

    const added = await api(auth).add(book);
    expect(added.status).toBe(200);
    expect(added.body.data).toEqual({ bookId: book, count: 1 });
    expect((await api(auth).add(book)).body.data.count).toBe(1);
    expect(await idsOf(auth)).toEqual([book]);

    const list = await api(auth).list();
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({
        id: book,
        title: 'Nhà Giả Kim',
        price: 63200,
        stockStatus: 'IN_STOCK',
        isAvailable: true,
        discountPercent: 0,
      }),
    ]);
    expect(list.body.data[0]).not.toHaveProperty('stock');
    expect(list.body.data[0].addedAt).toBeTruthy();

    expect((await api(auth).remove(book)).status).toBe(204);
    expect((await api(auth).remove(book)).status).toBe(204);
    expect(await idsOf(auth)).toEqual([]);
  });

  it('sách ẩn / danh mục ẩn / không tồn tại → 404; sách hết hàng → thêm được', async () => {
    const { auth } = await newCustomer();
    const hidden = await createBook();
    await pool.query('UPDATE books SET is_active = false WHERE id = $1', [hidden]);
    const inHiddenCategory = await createBook();
    await pool.query(
      'UPDATE categories SET is_active = false WHERE id = (SELECT category_id FROM books WHERE id = $1)',
      [inHiddenCategory],
    );
    const outOfStock = await createBook({ stock: 0 });

    expect((await api(auth).add(hidden)).status).toBe(404);
    expect((await api(auth).add(inHiddenCategory)).status).toBe(404);
    expect((await api(auth).add(999999)).status).toBe(404);
    expect((await api(auth).add(outOfStock)).status).toBe(200);
    expect((await api(auth).list()).body.data[0]).toMatchObject({
      id: outOfStock,
      stockStatus: 'OUT_OF_STOCK',
    });
  });
});

describe('Danh sách', () => {
  it('mới lưu trước, phân trang, giá hiện tại; sách bị ẩn sau khi lưu → isAvailable = false', async () => {
    const { auth } = await newCustomer();
    const books: number[] = [];
    for (const title of ['A', 'B', 'C']) {
      const id = await createBook({ title });
      books.push(id);
      await api(auth).add(id);
    }

    const page1 = await api(auth).list('?limit=2');
    expect(page1.body.data.map((b: { title: string }) => b.title)).toEqual(['C', 'B']);
    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });

    await pool.query('UPDATE books SET price = 30000 WHERE id = $1', [books[0]]);
    await pool.query('UPDATE books SET is_active = false WHERE id = $1', [books[1]]);
    const all = (await api(auth).list()).body.data;
    expect(all.find((b: { id: number }) => b.id === books[0])).toMatchObject({
      price: 30000,
      discountPercent: 40,
    });
    expect(all.find((b: { id: number }) => b.id === books[1])).toMatchObject({
      isAvailable: false,
    });
    expect(await idsOf(auth)).toEqual([books[2], books[1], books[0]]);
  });

  it('chỉ thấy danh sách của mình', async () => {
    const book = await createBook();
    const a = await newCustomer();
    const b = await newCustomer();
    await api(a.auth).add(book);
    expect((await api(b.auth).list()).body.data).toEqual([]);
    expect(await idsOf(b.auth)).toEqual([]);
    // B bỏ sách mà A đã thích → không ảnh hưởng A
    await api(b.auth).remove(book);
    expect(await idsOf(a.auth)).toEqual([book]);
  });
});

describe('Giới hạn & quyền', () => {
  const originalMax = env.WISHLIST_MAX_ITEMS;
  afterEach(() => {
    env.WISHLIST_MAX_ITEMS = originalMax;
  });

  it('đủ giới hạn → 409 WISHLIST_FULL (sách đã có vẫn thêm lại được); thêm song song khi còn 1 chỗ → chỉ 1 thành công', async () => {
    env.WISHLIST_MAX_ITEMS = 2;
    const { auth } = await newCustomer();
    const [b1, b2, b3, b4] = await Promise.all([1, 2, 3, 4].map(() => createBook()));

    await api(auth).add(b1);
    const results = await Promise.all([api(auth).add(b2), api(auth).add(b3)]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(results.find((res) => res.status === 409)!.body.error.code).toBe('WISHLIST_FULL');
    expect(await idsOf(auth)).toHaveLength(2);

    expect((await api(auth).add(b1)).status).toBe(200);
    const full = await api(auth).add(b4);
    expect(full.status).toBe(409);
    expect(full.body.error.message).toContain('tối đa 2 sách');
  });

  it('chưa đăng nhập → 401; Admin → 403', async () => {
    const book = await createBook();
    expect((await request(app).get('/api/me/wishlist')).status).toBe(401);
    expect((await request(app).put(`/api/me/wishlist/${book}`)).status).toBe(401);
    const admin = await loginAsAdmin();
    expect((await api(admin).add(book)).status).toBe(403);
    expect((await api(admin).ids()).status).toBe(403);
  });

  it('xoá cứng sách → dòng yêu thích tự xoá (CASCADE)', async () => {
    const book = await createBook();
    const { auth } = await newCustomer();
    await api(auth).add(book);
    await pool.query('DELETE FROM book_authors WHERE book_id = $1', [book]);
    await pool.query('DELETE FROM books WHERE id = $1', [book]);
    expect(await idsOf(auth)).toEqual([]);
  });
});
