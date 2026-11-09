import request from 'supertest';
import { app } from '../../src/app';
import { env } from '../../src/config/env';
import { pool } from '../../src/db/pool';
import * as groq from '../../src/lib/ai/groq';
import { loginAsAdmin } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';
import { newCustomer, placeOrder } from '../helpers/shop';

// M15 – Sở thích đọc sách & AI gợi ý sách (docs/03-modules/15-ai.md). AI được giả lập — không gọi Groq thật

jest.mock('../../src/lib/mailer');
jest.mock('../../src/lib/ai/groq', () => ({
  ...jest.requireActual('../../src/lib/ai/groq'),
  chatJson: jest.fn(),
}));
const chatJson = jest.mocked(groq.chatJson);

beforeEach(async () => {
  await resetDatabase();
  chatJson.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterAll(async () => {
  await pool.end();
});

const api = (auth: string) => ({
  getPrefs: () => request(app).get('/api/me/preferences').set('Authorization', auth),
  savePrefs: (body: object) =>
    request(app).put('/api/me/preferences').set('Authorization', auth).send(body),
  skip: () => request(app).post('/api/me/preferences/skip').set('Authorization', auth),
  recommend: () => request(app).get('/api/me/recommendations').set('Authorization', auth),
  refresh: () => request(app).post('/api/me/recommendations/refresh').set('Authorization', auth),
});

async function insertId(sql: string, params: unknown[]) {
  return (await pool.query<{ id: number }>(sql, params)).rows[0].id;
}
const category = (name: string, parentId: number | null = null, isActive = true) =>
  insertId('INSERT INTO categories (name, parent_id, is_active) VALUES ($1, $2, $3) RETURNING id', [
    name,
    parentId,
    isActive,
  ]);
const author = (name: string) =>
  insertId('INSERT INTO authors (name) VALUES ($1) RETURNING id', [name]);

async function book(
  title: string,
  categoryId: number,
  { authorIds = [] as number[], stock = 10, sold = 0, isActive = true, description = '' } = {},
) {
  const id = await insertId(
    `INSERT INTO books (title, category_id, original_price, price, stock, sold_count, is_active, description)
     VALUES ($1, $2, 50000, 50000, $3, $4, $5, $6) RETURNING id`,
    [title, categoryId, stock, sold, isActive, description],
  );
  for (const [i, authorId] of authorIds.entries()) {
    await pool.query(
      'INSERT INTO book_authors (book_id, author_id, sort_order) VALUES ($1, $2, $3)',
      [id, authorId, i],
    );
  }
  return id;
}

/** Dữ liệu mẫu: "Kỹ năng" (cha) > "Self help" (con), "Văn học", "Danh mục ẩn" */
async function seedCatalog() {
  const skills = await category('Sách Kỹ Năng');
  const selfHelp = await category('Sách Self Help', skills);
  const literature = await category('Sách Văn Học');
  const hidden = await category('Danh mục ẩn', null, false);
  const nna = await author('Nguyễn Nhật Ánh');
  const paulo = await author('Paulo Coelho');
  const books = {
    selfHelp1: await book('Hiểu Về Trái Tim', selfHelp, {
      sold: 5,
      description: '<p>Chữa   lành</p>',
    }),
    selfHelp2: await book('Đắc Nhân Tâm', selfHelp, { sold: 50 }),
    nna: await book('Mắt Biếc', literature, { authorIds: [nna] }),
    paulo: await book('Nhà Giả Kim', literature, { authorIds: [paulo], sold: 100 }),
    literature: await book('Tắt Đèn', literature),
    soldOut: await book('Hết Hàng', selfHelp, { stock: 0 }),
    inactive: await book('Đang Ẩn', selfHelp, { isActive: false }),
    hiddenCategory: await book('Danh Mục Ẩn', hidden),
  };
  return { categories: { skills, selfHelp, literature, hidden }, authors: { nna, paulo }, books };
}

/** AI giả: chọn các id truyền vào */
function aiPicks(...items: { bookId: number; reason: string }[]) {
  chatJson.mockResolvedValue({ content: JSON.stringify({ items }), model: 'test-model' });
}

/** Danh sách ứng viên đã gửi cho AI ở lần gọi thứ `call` */
function sentCandidates(call = 0) {
  const user = chatJson.mock.calls[call][0][1].content;
  return JSON.parse(user).danhSachUngVien as { id: number; moTa: string | null }[];
}

describe('Sở thích đọc sách /api/me/preferences', () => {
  it('khách mới: chưa được hỏi (onboarded = false), sở thích trống', async () => {
    const { auth } = await newCustomer();
    const res = await api(auth).getPrefs();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ onboarded: false, categories: [], authors: [], note: '' });
  });

  it('lưu sở thích → trả kèm tên, đánh dấu đã hỏi; lưu lại = ghi đè', async () => {
    const { categories, authors } = await seedCatalog();
    const { auth } = await newCustomer();

    const res = await api(auth).savePrefs({
      categoryIds: [categories.selfHelp, categories.selfHelp],
      authorIds: [authors.nna],
      note: '  Thích sách nhẹ nhàng  ',
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      onboarded: true,
      categories: [{ id: categories.selfHelp, name: 'Sách Self Help' }],
      authors: [{ id: authors.nna, name: 'Nguyễn Nhật Ánh' }],
      note: 'Thích sách nhẹ nhàng',
    });

    const again = await api(auth).savePrefs({ categoryIds: [categories.literature] });
    expect(again.body.data).toMatchObject({
      categories: [{ id: categories.literature }],
      authors: [],
      note: '',
    });
  });

  it('thể loại không tồn tại / đang ẩn, tác giả không tồn tại, quá số lượng, mô tả quá dài → 422', async () => {
    const { categories } = await seedCatalog();
    const { auth } = await newCustomer();
    const fieldOf = async (body: object) => {
      const res = await api(auth).savePrefs(body);
      expect(res.status).toBe(422);
      return res.body.error.details[0].field;
    };
    expect(await fieldOf({ categoryIds: [9999] })).toBe('categoryIds');
    expect(await fieldOf({ categoryIds: [categories.hidden] })).toBe('categoryIds');
    expect(await fieldOf({ authorIds: [9999] })).toBe('authorIds');
    expect(
      await fieldOf({
        categoryIds: Array.from({ length: env.PREFERENCE_MAX_CATEGORIES + 1 }, (_, i) => i + 1),
      }),
    ).toBe('categoryIds');
    expect(await fieldOf({ note: 'a'.repeat(env.PREFERENCE_NOTE_MAX_LENGTH + 1) })).toBe('note');
  });

  it('bỏ qua hộp thoại lần đầu → đã hỏi, giữ nguyên sở thích', async () => {
    const { categories } = await seedCatalog();
    const { auth } = await newCustomer();
    expect((await api(auth).skip()).body.data.onboarded).toBe(true);

    await api(auth).savePrefs({ categoryIds: [categories.selfHelp] });
    const res = await api(auth).skip();
    expect(res.body.data.categories).toHaveLength(1);
  });

  it('chưa đăng nhập → 401; Admin → 403', async () => {
    expect((await request(app).get('/api/me/preferences')).status).toBe(401);
    expect((await api(await loginAsAdmin()).getPrefs()).status).toBe(403);
    expect((await api(await loginAsAdmin()).recommend()).status).toBe(403);
  });
});

describe('Tìm tác giả GET /api/authors?q=', () => {
  it('tìm không dấu, chỉ trả id + tên, giới hạn số dòng', async () => {
    const { authors } = await seedCatalog();
    const res = await request(app).get('/api/authors?q=nhat anh');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: authors.nna, name: 'Nguyễn Nhật Ánh' }]);
    expect((await request(app).get('/api/authors?limit=1')).body.data).toHaveLength(1);
  });
});

describe('Gợi ý sách /api/me/recommendations', () => {
  it('ứng viên chỉ gồm sách đang bán, còn hàng, chưa mua / chưa yêu thích; ưu tiên đúng sở thích', async () => {
    const { categories, books } = await seedCatalog();
    const { auth } = await newCustomer();
    await api(auth).savePrefs({ categoryIds: [categories.skills] }); // chọn cha = tính cả con
    await placeOrder(auth, books.selfHelp2);
    await request(app).put(`/api/me/wishlist/${books.literature}`).set('Authorization', auth);
    aiPicks({ bookId: books.selfHelp1, reason: 'Hợp gu' });

    await api(auth).recommend().expect(200);

    const ids = sentCandidates().map((c) => c.id);
    expect(ids[0]).toBe(books.selfHelp1); // đúng thể loại khách chọn → điểm cao nhất
    expect(ids).toEqual(expect.arrayContaining([books.nna, books.paulo]));
    for (const excluded of [
      books.selfHelp2, // đã mua
      books.literature, // đang yêu thích
      books.soldOut,
      books.inactive,
      books.hiddenCategory,
    ]) {
      expect(ids).not.toContain(excluded);
    }
    // Mô tả gửi AI: bỏ thẻ HTML, gộp khoảng trắng
    expect(sentCandidates()[0].moTa).toBe('Chữa lành');
  });

  it('AI chọn sách → trả thẻ sách + lý do; sách AI bịa / trùng bị bỏ; thiếu thì bù không lý do', async () => {
    const { books } = await seedCatalog();
    const { auth } = await newCustomer();
    aiPicks(
      { bookId: 99999, reason: 'Sách bịa' },
      { bookId: books.nna, reason: 'Truyện tuổi thơ nhẹ nhàng' },
      { bookId: books.nna, reason: 'Trùng' },
    );

    const res = await api(auth).recommend();

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('ai');
    const items = res.body.data.items as { book: { id: number; title: string }; reason: string }[];
    expect(items[0]).toMatchObject({
      book: { id: books.nna, title: 'Mắt Biếc', price: 50000, stockStatus: 'IN_STOCK' },
      reason: 'Truyện tuổi thơ nhẹ nhàng',
    });
    expect(items.map((i) => i.book.id)).not.toContain(99999);
    expect(new Set(items.map((i) => i.book.id)).size).toBe(items.length);
    expect(items.slice(1).every((i) => i.reason === null)).toBe(true);
    expect(items.length).toBe(Math.min(env.RECOMMEND_RESULT_SIZE, 5)); // 5 sách hợp lệ trong mẫu
  });

  it('dùng lại cache khi hồ sơ không đổi; đổi sở thích / "Gợi ý lại" → gọi AI lại', async () => {
    const { books, categories } = await seedCatalog();
    const { auth } = await newCustomer();
    aiPicks({ bookId: books.paulo, reason: 'Hay' });

    const first = await api(auth).recommend();
    const second = await api(auth).recommend();
    expect(chatJson).toHaveBeenCalledTimes(1);
    expect(second.body.data.generatedAt).toBe(first.body.data.generatedAt);
    expect(second.body.data.items[0].reason).toBe('Hay');

    await api(auth).savePrefs({ categoryIds: [categories.literature] });
    await api(auth).recommend();
    expect(chatJson).toHaveBeenCalledTimes(2);

    await api(auth).refresh().expect(200);
    expect(chatJson).toHaveBeenCalledTimes(3);
  });

  it('cache quá RECOMMEND_CACHE_HOURS → gợi ý lại', async () => {
    const { books, categories } = await seedCatalog();
    const { auth } = await newCustomer();
    aiPicks({ bookId: books.paulo, reason: 'Hay' });
    await api(auth).recommend();
    await pool.query(
      `UPDATE recommendation_cache SET created_at = now() - make_interval(hours => $1)`,
      [Math.ceil(env.RECOMMEND_CACHE_HOURS) + 1],
    );
    await api(auth).recommend();
    expect(chatJson).toHaveBeenCalledTimes(2);
  });

  it('sách trong cache bị ẩn / hết hàng sau đó → không hiện', async () => {
    const { books } = await seedCatalog();
    const { auth } = await newCustomer();
    aiPicks({ bookId: books.paulo, reason: 'Hay' }, { bookId: books.nna, reason: 'Ok' });
    await api(auth).recommend();

    await pool.query('UPDATE books SET stock = 0 WHERE id = $1', [books.paulo]);
    const res = await api(auth).recommend();
    expect(chatJson).toHaveBeenCalledTimes(1);
    expect(res.body.data.items.map((i: { book: { id: number } }) => i.book.id)).not.toContain(
      books.paulo,
    );
  });

  it('AI lỗi / trả JSON hỏng → dự phòng theo điểm DB (không lý do), không lưu cache', async () => {
    const { books, categories } = await seedCatalog();
    const { auth } = await newCustomer();
    await api(auth).savePrefs({ categoryIds: [categories.selfHelp] });

    chatJson.mockRejectedValue(new groq.AiError('rate limited', 429));
    const res = await api(auth).recommend();
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('fallback');
    const items = res.body.data.items as { book: { id: number }; reason: null }[];
    expect(items.every((i) => i.reason === null)).toBe(true);
    // Đúng thể loại khách chọn lên đầu, trong đó bán chạy hơn đứng trước
    expect(items.slice(0, 2).map((i) => i.book.id)).toEqual([books.selfHelp2, books.selfHelp1]);
    expect((await pool.query('SELECT 1 FROM recommendation_cache')).rowCount).toBe(0);

    chatJson.mockResolvedValue({ content: 'không phải json', model: 'test-model' });
    expect((await api(auth).recommend()).body.data.source).toBe('fallback');
    expect(chatJson).toHaveBeenCalledTimes(2);
  });

  it('khách chưa có sở thích / lịch sử → vẫn có gợi ý (sách bán chạy)', async () => {
    const { books } = await seedCatalog();
    const { auth } = await newCustomer();
    chatJson.mockRejectedValue(new Error('down'));
    const res = await api(auth).recommend();
    expect(res.body.data.items[0].book.id).toBe(books.paulo);
  });

  it('không có sách nào → danh sách rỗng, không gọi AI', async () => {
    const { auth } = await newCustomer();
    const res = await api(auth).recommend();
    expect(res.body.data).toMatchObject({ source: 'fallback', items: [] });
    expect(chatJson).not.toHaveBeenCalled();
  });
});
