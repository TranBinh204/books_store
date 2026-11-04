import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import * as mailer from '../../src/lib/mailer';
import { loginAsAdmin } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';
import { createBook, deliverOrder, newCustomer, placeOrder } from '../helpers/shop';

// M10 – Đánh giá sách (docs/03-modules/10-review.md)

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

const CONTENT = 'Sách rất hay, in đẹp, giao nhanh';

const me = (auth: string) => ({
  write: (body: object) =>
    request(app).post('/api/me/reviews').set('Authorization', auth).send(body),
  edit: (id: number, body: object) =>
    request(app).patch(`/api/me/reviews/${id}`).set('Authorization', auth).send(body),
  status: (bookId: number) =>
    request(app).get(`/api/me/books/${bookId}/review-status`).set('Authorization', auth),
  ofOrder: (orderId: number) =>
    request(app).get(`/api/me/orders/${orderId}/reviews`).set('Authorization', auth),
});

const pub = {
  list: (bookId: number, query = '') => request(app).get(`/api/books/${bookId}/reviews${query}`),
  summary: (bookId: number) => request(app).get(`/api/books/${bookId}/reviews/summary`),
  book: (bookId: number) => request(app).get(`/api/books/${bookId}`),
};

const adminApi = {
  list: (query = '') => request(app).get(`/api/admin/reviews${query}`).set('Authorization', admin),
  hide: (id: number, reason = 'Spam / quảng cáo') =>
    request(app).post(`/api/admin/reviews/${id}/hide`).set('Authorization', admin).send({ reason }),
  unhide: (id: number) =>
    request(app).post(`/api/admin/reviews/${id}/unhide`).set('Authorization', admin),
};

/** Khách mới đã nhận đơn có `bookId` → { auth, orderId } */
async function deliveredCustomer(bookId: number, fullName?: string) {
  const customer = await newCustomer({ fullName });
  const order = await placeOrder(customer.auth, bookId);
  await deliverOrder(admin, order.id);
  return { ...customer, orderId: order.id, orderCode: order.code };
}

describe('Viết đánh giá', () => {
  it('đơn Đã giao → viết được; điểm sách cập nhật; công khai hiện họ tên đầy đủ', async () => {
    const book = await createBook();
    const a = await deliveredCustomer(book, 'Trần Thị Bích');
    const b = await deliveredCustomer(book, 'Lê Văn Cường');

    const res = await me(a.auth).write({
      orderId: a.orderId,
      bookId: book,
      rating: 5,
      content: CONTENT,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      bookId: book,
      orderId: a.orderId,
      rating: 5,
      content: CONTENT,
      isHidden: false,
      isEdited: false,
      canEdit: true,
    });
    // Không có nội dung → được
    expect((await me(b.auth).write({ orderId: b.orderId, bookId: book, rating: 2 })).status).toBe(
      201,
    );

    expect((await pub.book(book)).body.data).toMatchObject({ ratingAvg: 3.5, ratingCount: 2 });
    expect((await pub.summary(book)).body.data).toEqual({
      average: 3.5,
      count: 2,
      distribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 },
    });
    const list = (await pub.list(book)).body.data;
    expect(list.map((r: { authorName: string }) => r.authorName)).toEqual([
      'Lê Văn Cường',
      'Trần Thị Bích',
    ]);
    expect(list[0]).not.toHaveProperty('userId');
  });

  it('không được: đơn chưa giao, đơn người khác, sách không có trong đơn; viết lại → 409; cùng sách đơn khác → được', async () => {
    const book = await createBook({ stock: 20 });
    const other = await createBook();
    const a = await deliveredCustomer(book);
    const pending = await placeOrder(a.auth, book);
    const b = await newCustomer();

    const notAllowed = async (auth: string, orderId: number, bookId: number) => {
      const res = await me(auth).write({ orderId, bookId, rating: 4 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('REVIEW_NOT_ALLOWED');
    };
    await notAllowed(a.auth, pending.id, book);
    await notAllowed(b.auth, a.orderId, book);
    await notAllowed(a.auth, a.orderId, other);

    expect((await me(a.auth).write({ orderId: a.orderId, bookId: book, rating: 4 })).status).toBe(
      201,
    );
    const again = await me(a.auth).write({ orderId: a.orderId, bookId: book, rating: 3 });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_REVIEWED');

    // Q1: cùng sách ở đơn thứ 2 → đánh giá thêm được
    await deliverOrder(admin, pending.id);
    expect((await me(a.auth).write({ orderId: pending.id, bookId: book, rating: 5 })).status).toBe(
      201,
    );
    expect((await pub.book(book)).body.data).toMatchObject({ ratingAvg: 4.5, ratingCount: 2 });
  });

  it('dữ liệu: sao ngoài 1–5, nội dung < 10 hoặc > 1000 ký tự → 422; khoảng trắng thừa được bỏ', async () => {
    const book = await createBook();
    const a = await deliveredCustomer(book);
    const body = { orderId: a.orderId, bookId: book };
    for (const bad of [
      { rating: 0 },
      { rating: 6 },
      { rating: 4.5 },
      { rating: 4, content: 'Quá ngắn' },
      { rating: 4, content: 'x'.repeat(1001) },
    ]) {
      expect((await me(a.auth).write({ ...body, ...bad })).status).toBe(422);
    }
    const res = await me(a.auth).write({ ...body, rating: 4, content: '   Rất   đáng đọc   ' });
    expect(res.body.data.content).toBe('Rất đáng đọc');
    // Chỉ khoảng trắng = không có nội dung
    const b = await deliveredCustomer(book);
    expect(
      (await me(b.auth).write({ orderId: b.orderId, bookId: book, rating: 3, content: '   ' })).body
        .data.content,
    ).toBeNull();
  });

  it('Admin / chưa đăng nhập không viết được', async () => {
    const book = await createBook();
    const a = await deliveredCustomer(book);
    expect((await me(admin).write({ orderId: a.orderId, bookId: book, rating: 5 })).status).toBe(
      403,
    );
    expect((await request(app).post('/api/me/reviews').send({})).status).toBe(401);
  });
});

describe('Sửa đánh giá', () => {
  it('trong hạn → được, isEdited, điểm tính lại; quá hạn → REVIEW_EDIT_EXPIRED; người khác → 404', async () => {
    const book = await createBook();
    const a = await deliveredCustomer(book);
    const id = (await me(a.auth).write({ orderId: a.orderId, bookId: book, rating: 5 })).body.data
      .id;

    const edited = await me(a.auth).edit(id, { rating: 3, content: CONTENT });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({ rating: 3, content: CONTENT, isEdited: true });
    expect((await pub.book(book)).body.data.ratingAvg).toBe(3);
    expect((await pub.list(book)).body.data[0].isEdited).toBe(true);

    const b = await newCustomer();
    expect((await me(b.auth).edit(id, { rating: 1 })).status).toBe(404);

    await pool.query(`UPDATE reviews SET created_at = now() - interval '31 days' WHERE id = $1`, [
      id,
    ]);
    const expired = await me(a.auth).edit(id, { rating: 4 });
    expect(expired.status).toBe(400);
    expect(expired.body.error.code).toBe('REVIEW_EDIT_EXPIRED');
    expect((await me(a.auth).status(book)).body.data.myReviews[0].canEdit).toBe(false);
  });
});

describe('Công khai', () => {
  it('lọc sao / có nội dung, phân trang, mới nhất trước; sách ẩn → 404', async () => {
    const book = await createBook({ stock: 50 });
    const ratings = [5, 4, 5, 1];
    for (const [index, rating] of ratings.entries()) {
      const c = await deliveredCustomer(book);
      await me(c.auth).write({
        orderId: c.orderId,
        bookId: book,
        rating,
        content: index % 2 === 0 ? `${CONTENT} ${index}` : undefined,
      });
    }

    const page1 = await pub.list(book, '?limit=3');
    expect(page1.body.data.map((r: { rating: number }) => r.rating)).toEqual([1, 5, 4]);
    expect(page1.body.meta).toEqual({ page: 1, limit: 3, total: 4, totalPages: 2 });
    expect((await pub.list(book, '?rating=5')).body.meta.total).toBe(2);
    expect(
      (await pub.list(book, '?withContent=true')).body.data.every(
        (r: { content: string | null }) => r.content,
      ),
    ).toBe(true);
    expect((await pub.list(book, '?rating=6')).status).toBe(422);

    await pool.query('UPDATE books SET is_active = false WHERE id = $1', [book]);
    expect((await pub.list(book)).status).toBe(404);
    expect((await pub.summary(book)).status).toBe(404);
  });
});

describe('Trạng thái của tôi', () => {
  it('review-status & đánh giá theo đơn', async () => {
    const book = await createBook({ stock: 20 });
    const a = await deliveredCustomer(book);
    const second = await placeOrder(a.auth, book);
    await deliverOrder(admin, second.id);

    let status = (await me(a.auth).status(book)).body.data;
    expect(status.reviewableOrders.map((o: { orderId: number }) => o.orderId).sort()).toEqual(
      [a.orderId, second.id].sort(),
    );
    expect(status.reviewableOrders[0].deliveredAt).toBeTruthy();
    expect(status.myReviews).toEqual([]);

    await me(a.auth).write({ orderId: a.orderId, bookId: book, rating: 4 });
    status = (await me(a.auth).status(book)).body.data;
    expect(status.reviewableOrders.map((o: { orderId: number }) => o.orderId)).toEqual([second.id]);
    expect(status.myReviews).toEqual([
      expect.objectContaining({ orderId: a.orderId, rating: 4, canEdit: true, isHidden: false }),
    ]);

    expect((await me(a.auth).ofOrder(a.orderId)).body.data).toEqual([
      expect.objectContaining({ bookId: book, rating: 4 }),
    ]);
    expect((await me(a.auth).ofOrder(second.id)).body.data).toEqual([]);
    // Đơn người khác → rỗng (không lộ dữ liệu)
    const b = await newCustomer();
    expect((await me(b.auth).ofOrder(a.orderId)).body.data).toEqual([]);
  });
});

describe('Admin', () => {
  it('ẩn (lý do bắt buộc) → khỏi công khai, điểm tính lại; tác giả thấy isHidden & không sửa được; hiện lại', async () => {
    const book = await createBook();
    const a = await deliveredCustomer(book, 'Phạm Minh Đức');
    const b = await deliveredCustomer(book);
    const id = (
      await me(a.auth).write({
        orderId: a.orderId,
        bookId: book,
        rating: 1,
        content: 'Mua ở shop khác rẻ hơn nhiều',
      })
    ).body.data.id;
    await me(b.auth).write({ orderId: b.orderId, bookId: book, rating: 5 });
    expect((await pub.book(book)).body.data.ratingAvg).toBe(3);

    expect((await adminApi.hide(id, '')).status).toBe(422);
    expect((await adminApi.hide(id)).status).toBe(200);
    expect((await adminApi.hide(id)).body.error.code).toBe('ALREADY_HIDDEN');

    expect((await pub.list(book)).body.meta.total).toBe(1);
    expect((await pub.book(book)).body.data).toMatchObject({ ratingAvg: 5, ratingCount: 1 });
    const mine = (await me(a.auth).status(book)).body.data.myReviews[0];
    expect(mine).toMatchObject({ isHidden: true, canEdit: false });
    expect((await me(a.auth).edit(id, { rating: 2 })).body.error.code).toBe('REVIEW_HIDDEN');

    const listed = (await adminApi.list('?status=hidden')).body.data;
    expect(listed).toEqual([
      expect.objectContaining({
        id,
        isHidden: true,
        hiddenReason: 'Spam / quảng cáo',
        customer: expect.objectContaining({ fullName: 'Phạm Minh Đức' }),
        order: expect.objectContaining({ id: a.orderId }),
      }),
    ]);

    expect((await adminApi.unhide(id)).status).toBe(200);
    expect((await adminApi.unhide(id)).body.error.code).toBe('NOT_HIDDEN');
    expect((await pub.book(book)).body.data).toMatchObject({ ratingAvg: 3, ratingCount: 2 });
  });

  it('lọc sao / trạng thái / tìm (sách, tên khách không dấu, nội dung) / sắp xếp; khách → 403', async () => {
    const book1 = await createBook({ title: 'Nhà Giả Kim' });
    const book2 = await createBook({ title: 'Đắc Nhân Tâm' });
    const a = await deliveredCustomer(book1, 'Trần Thị Bích');
    const b = await deliveredCustomer(book2, 'Lê Văn Cường');
    await me(a.auth).write({
      orderId: a.orderId,
      bookId: book1,
      rating: 2,
      content: 'Bìa bị móp khi giao',
    });
    await me(b.auth).write({ orderId: b.orderId, bookId: book2, rating: 5 });

    const ids = async (query: string) =>
      (await adminApi.list(query)).body.data.map((r: { book: { id: number } }) => r.book.id);
    expect(await ids('')).toEqual([book2, book1]);
    expect(await ids('?rating=2')).toEqual([book1]);
    expect(await ids('?status=visible')).toEqual([book2, book1]);
    expect(await ids('?q=dac%20nhan')).toEqual([book2]);
    expect(await ids('?q=tran%20thi')).toEqual([book1]);
    expect(await ids('?q=bia%20bi%20mop')).toEqual([book1]);
    expect(await ids('?sort=rating_asc')).toEqual([book1, book2]);
    expect(await ids('?q=%25')).toEqual([]);

    expect((await request(app).get('/api/admin/reviews').set('Authorization', a.auth)).status).toBe(
      403,
    );
  });
});
