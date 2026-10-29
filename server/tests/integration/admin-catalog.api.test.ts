import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import * as imageStorage from '../../src/lib/image-storage';
import { loginAsAdmin, loginAsCustomer, PNG_BYTES } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';

// Không lưu ảnh thật (local / Cloudinary) khi chạy test
jest.mock('../../src/lib/image-storage', () => {
  const actual = jest.requireActual('../../src/lib/image-storage');
  let counter = 0;
  return {
    ...actual,
    saveImage: jest.fn(async () => {
      counter += 1;
      return { url: `https://img.test/books/${counter}.png`, publicId: `books/${counter}` };
    }),
    removeImages: jest.fn(async () => undefined),
  };
});
const removeImages = jest.mocked(imageStorage.removeImages);

let admin: string;

beforeEach(async () => {
  await resetDatabase();
  admin = await loginAsAdmin();
});

afterAll(async () => {
  await pool.end();
});

const api = {
  get: (url: string) => request(app).get(`/api/admin${url}`).set('Authorization', admin),
  post: (url: string, body?: object) =>
    request(app).post(`/api/admin${url}`).set('Authorization', admin).send(body),
  patch: (url: string, body: object) =>
    request(app).patch(`/api/admin${url}`).set('Authorization', admin).send(body),
  delete: (url: string) => request(app).delete(`/api/admin${url}`).set('Authorization', admin),
};

async function createCategory(name: string, parentId: number | null = null) {
  const res = await api.post('/categories', { name, parentId });
  expect(res.status).toBe(201);
  return res.body.data.id as number;
}

async function createAuthor(name: string) {
  return (await api.post('/authors', { name })).body.data.id as number;
}

async function createPublisher(name: string) {
  return (await api.post('/publishers', { name })).body.data.id as number;
}

async function createBook(overrides: Record<string, unknown> = {}) {
  const categoryId =
    (overrides.categoryId as number) ?? (await createCategory(`DM ${Math.random()}`));
  const authorId = await createAuthor(`Tác giả ${Math.random()}`);
  const res = await api.post('/books', {
    title: 'Nhà Giả Kim',
    categoryId,
    authorIds: [authorId],
    originalPrice: 79000,
    price: 63200,
    ...overrides,
  });
  expect(res.status).toBe(201);
  return res.body.data;
}

describe('Phân quyền', () => {
  it('CUSTOMER gọi API admin → 403', async () => {
    const customer = await loginAsCustomer();
    for (const url of ['/categories', '/authors', '/publishers', '/books', '/inventory-logs']) {
      const res = await request(app).get(`/api/admin${url}`).set('Authorization', customer);
      expect(res.status).toBe(403);
    }
  });
});

describe('Danh mục', () => {
  it('tạo danh mục gốc + con → trả về dạng cây, kèm số sách', async () => {
    const root = await createCategory('Sách Văn Học');
    await createCategory('Tiểu thuyết', root);
    await createCategory('Truyện ngắn', root);

    const res = await api.get('/categories');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ name: 'Sách Văn Học', bookCount: 0 });
    expect(res.body.data[0].children.map((c: { name: string }) => c.name)).toEqual([
      'Tiểu thuyết',
      'Truyện ngắn',
    ]);
  });

  it('icon danh mục (iconKey): mặc định null; đặt / đổi / bỏ; khóa lạ → 422; cửa hàng thấy iconKey', async () => {
    const root = await createCategory('Fantasy');
    expect((await api.get('/categories')).body.data[0].iconKey).toBeNull();

    expect((await api.patch(`/categories/${root}`, { iconKey: 'fantasy' })).body.data.iconKey).toBe(
      'fantasy',
    );
    // sửa trường khác → giữ nguyên icon
    expect((await api.patch(`/categories/${root}`, { sortOrder: 3 })).body.data.iconKey).toBe(
      'fantasy',
    );
    expect((await request(app).get('/api/categories')).body.data[0].iconKey).toBe('fantasy');

    expect((await api.patch(`/categories/${root}`, { iconKey: 'rong-lua' })).status).toBe(422);
    expect((await api.post('/categories', { name: 'Manga', iconKey: 'khong-co' })).status).toBe(
      422,
    );

    const manga = await api.post('/categories', { name: 'Manga', iconKey: 'manga' });
    expect(manga.body.data.iconKey).toBe('manga');
    expect(
      (await api.patch(`/categories/${root}`, { iconKey: null })).body.data.iconKey,
    ).toBeNull();
  });

  it('mô tả danh mục (description): mặc định null; đặt / giữ khi sửa trường khác / xoá; quá 300 ký tự → 422; chỉ trang chi tiết cửa hàng trả mô tả', async () => {
    const root = await createCategory('Tâm lý');
    expect((await api.get('/categories')).body.data[0].description).toBeNull();

    const set = await api.patch(`/categories/${root}`, { description: '  Mê cung   tâm trí  ' });
    expect(set.body.data.description).toBe('Mê cung tâm trí');
    // sửa trường khác → giữ nguyên mô tả
    expect((await api.patch(`/categories/${root}`, { sortOrder: 2 })).body.data.description).toBe(
      'Mê cung tâm trí',
    );

    expect((await api.patch(`/categories/${root}`, { description: 'x'.repeat(301) })).status).toBe(
      422,
    );
    expect((await api.post('/categories', { name: 'Mới', description: 'y'.repeat(301) })).status).toBe(
      422,
    );

    // Cây công khai (header) không mang mô tả; trang chi tiết có
    expect((await request(app).get('/api/categories')).body.data[0]).not.toHaveProperty(
      'description',
    );
    expect((await request(app).get(`/api/categories/${root}`)).body.data.description).toBe(
      'Mê cung tâm trí',
    );

    // Chuỗi rỗng = xoá mô tả
    expect((await api.patch(`/categories/${root}`, { description: '' })).body.data.description).toBeNull();
  });

  it('chỉ 2 cấp: không cho tạo con của danh mục con', async () => {
    const root = await createCategory('Gốc');
    const child = await createCategory('Con', root);
    const res = await api.post('/categories', { name: 'Cháu', parentId: child });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CATEGORY_TOO_DEEP');
  });

  it('danh mục đang có con không thể chuyển thành danh mục con', async () => {
    const a = await createCategory('A');
    await createCategory('A1', a);
    const b = await createCategory('B');
    const res = await api.patch(`/categories/${a}`, { parentId: b });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CATEGORY_TOO_DEEP');
  });

  it('trùng tên trong cùng cha (không phân biệt hoa thường) → 409; khác cha thì được', async () => {
    const a = await createCategory('A');
    const b = await createCategory('B');
    await createCategory('Thiếu nhi', a);

    const dup = await api.post('/categories', { name: 'THIẾU NHI', parentId: a });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('CATEGORY_NAME_EXISTS');

    expect((await api.post('/categories', { name: 'Thiếu nhi', parentId: b })).status).toBe(201);
  });

  it('xoá: còn con / còn sách → 409; trống → 204', async () => {
    const root = await createCategory('Gốc');
    const child = await createCategory('Con', root);
    await createBook({ categoryId: child });

    expect((await api.delete(`/categories/${root}`)).body.error.code).toBe('CATEGORY_NOT_EMPTY');
    expect((await api.delete(`/categories/${child}`)).body.error.code).toBe('CATEGORY_NOT_EMPTY');

    const empty = await createCategory('Trống');
    expect((await api.delete(`/categories/${empty}`)).status).toBe(204);
  });

  it('ẩn danh mục', async () => {
    const id = await createCategory('Gốc');
    const res = await api.patch(`/categories/${id}`, { isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });
});

describe('Tác giả & nhà xuất bản', () => {
  it('tạo, trùng tên (không phân biệt hoa thường) → 409', async () => {
    expect((await api.post('/authors', { name: '  Nguyễn   Nhật Ánh ' })).body.data.name).toBe(
      'Nguyễn Nhật Ánh',
    );
    const dup = await api.post('/authors', { name: 'nguyễn nhật ánh' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('AUTHOR_NAME_EXISTS');
  });

  it('tìm kiếm không dấu + phân trang', async () => {
    await createAuthor('Nguyễn Nhật Ánh');
    await createAuthor('Paulo Coelho');
    await createAuthor('Nguyễn Du');

    const res = await api.get('/authors?q=nguyen&limit=1');
    expect(res.body.meta).toMatchObject({ total: 2, totalPages: 2, limit: 1 });
    expect(res.body.data).toHaveLength(1);
  });

  it('xoá tác giả / NXB đang có sách → 409', async () => {
    const book = await createBook({ publisherId: await createPublisher('NXB Trẻ') });

    const author = await api.delete(`/authors/${book.authors[0].id}`);
    expect(author.status).toBe(409);
    expect(author.body.error.code).toBe('AUTHOR_IN_USE');

    const publisher = await api.delete(`/publishers/${book.publisher.id}`);
    expect(publisher.body.error.code).toBe('PUBLISHER_IN_USE');
  });
});

describe('Sách', () => {
  it('tạo sách đầy đủ → chi tiết đúng thứ tự tác giả & ảnh, ghi log tồn kho ban đầu', async () => {
    const categoryId = await createCategory('Văn học');
    const a1 = await createAuthor('Tác giả chính');
    const a2 = await createAuthor('Đồng tác giả');
    const publisherId = await createPublisher('NXB Hội Nhà Văn');

    const res = await api.post('/books', {
      title: 'Nhà Giả Kim',
      categoryId,
      authorIds: [a2, a1],
      publisherId,
      isbn: '978-604-58-9342-1',
      description: 'Dòng 1\nDòng 2',
      publishYear: 2023,
      pages: 228,
      size: '13 x 20.5 cm',
      weightGram: 250,
      coverType: 'PAPERBACK',
      originalPrice: 79000,
      price: 63200,
      initialStock: 50,
      images: [
        { url: 'https://img.test/b.png', publicId: 'books/b' },
        { url: 'https://img.test/a.png', publicId: 'books/a' },
      ],
    });

    expect(res.status).toBe(201);
    const book = res.body.data;
    expect(book).toMatchObject({
      title: 'Nhà Giả Kim',
      isbn: '9786045893421',
      stock: 50,
      price: 63200,
      originalPrice: 79000,
      publisher: { id: publisherId, name: 'NXB Hội Nhà Văn' },
      category: { id: categoryId, name: 'Văn học', parentId: null },
    });
    expect(book.authors.map((a: { id: number }) => a.id)).toEqual([a2, a1]);
    expect(book.images.map((i: { publicId: string }) => i.publicId)).toEqual([
      'books/b',
      'books/a',
    ]);

    const logs = await api.get(`/inventory-logs?bookId=${book.id}`);
    expect(logs.body.data).toHaveLength(1);
    expect(logs.body.data[0]).toMatchObject({
      change: 50,
      stockAfter: 50,
      reason: 'IMPORT',
      note: 'Tồn kho ban đầu',
      createdBy: { name: 'Admin Test' },
    });
  });

  it('validate: giá bán > giá bìa, thiếu tác giả, ISBN sai → 422', async () => {
    const categoryId = await createCategory('DM');
    const res = await api.post('/books', {
      title: 'X',
      categoryId,
      authorIds: [],
      isbn: '123',
      originalPrice: 50000,
      price: 60000,
    });
    expect(res.status).toBe(422);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['authorIds', 'isbn', 'price']));
  });

  it('danh mục / tác giả không tồn tại → 404; ISBN trùng → 409', async () => {
    const categoryId = await createCategory('DM');
    const author = await createAuthor('TG');
    const base = { title: 'X', categoryId, authorIds: [author], originalPrice: 1, price: 1 };

    expect((await api.post('/books', { ...base, categoryId: 9999 })).status).toBe(404);
    expect((await api.post('/books', { ...base, authorIds: [author, 9999] })).status).toBe(404);

    await api.post('/books', { ...base, isbn: '9786045893421' });
    const dup = await api.post('/books', { ...base, isbn: '978-6045893421' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ISBN_EXISTS');
  });

  it('sửa sách: thay danh sách tác giả & ảnh, xoá file ảnh bị bỏ, không đổi tồn kho', async () => {
    const book = await createBook({
      initialStock: 10,
      images: [
        { url: 'u1', publicId: 'books/1' },
        { url: 'u2', publicId: 'books/2' },
      ],
    });
    const newAuthor = await createAuthor('Tác giả mới');

    const res = await api.patch(`/books/${book.id}`, {
      title: 'Nhà Giả Kim (tái bản)',
      categoryId: book.category.id,
      authorIds: [newAuthor],
      originalPrice: 90000,
      price: 90000,
      images: [
        { url: 'u2', publicId: 'books/2' },
        { url: 'u3', publicId: 'books/3' },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: 'Nhà Giả Kim (tái bản)',
      stock: 10,
      price: 90000,
    });
    expect(res.body.data.authors.map((a: { id: number }) => a.id)).toEqual([newAuthor]);
    expect(res.body.data.images.map((i: { publicId: string }) => i.publicId)).toEqual([
      'books/2',
      'books/3',
    ]);
    expect(removeImages).toHaveBeenCalledWith(['books/1']);
  });

  it('ẩn / hiện sách', async () => {
    const book = await createBook();
    const res = await api.patch(`/books/${book.id}/status`, { isActive: false });
    expect(res.body.data.isActive).toBe(false);
  });

  it('danh sách: tìm không dấu, lọc danh mục (gồm danh mục con), trạng thái, tồn kho, phân trang', async () => {
    const root = await createCategory('Văn học');
    const child = await createCategory('Tiểu thuyết', root);
    const other = await createCategory('Kỹ năng');

    await createBook({ title: 'Nhà Giả Kim', categoryId: child, initialStock: 0 });
    await createBook({ title: 'Đắc Nhân Tâm', categoryId: other, initialStock: 3 });
    const hidden = await createBook({ title: 'Mắt Biếc', categoryId: root, initialStock: 100 });
    await api.patch(`/books/${hidden.id}/status`, { isActive: false });

    const search = await api.get('/books?q=dac nhan');
    expect(search.body.data.map((b: { title: string }) => b.title)).toEqual(['Đắc Nhân Tâm']);

    const byRoot = await api.get(`/books?categoryId=${root}&sort=title_asc`);
    expect(byRoot.body.data.map((b: { title: string }) => b.title)).toEqual([
      'Mắt Biếc',
      'Nhà Giả Kim',
    ]);

    expect((await api.get('/books?status=hidden')).body.meta.total).toBe(1);
    expect((await api.get('/books?stock=out')).body.data[0].title).toBe('Nhà Giả Kim');
    expect((await api.get('/books?stock=low')).body.data[0].title).toBe('Đắc Nhân Tâm');

    const paged = await api.get('/books?limit=2&page=2');
    expect(paged.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
    expect(paged.body.data).toHaveLength(1);
  });

  it('sách không tồn tại → 404', async () => {
    expect((await api.get('/books/9999')).status).toBe(404);
  });
});

describe('Tồn kho', () => {
  it('nhập hàng & điều chỉnh → cập nhật tồn kho + ghi lịch sử', async () => {
    const book = await createBook({ initialStock: 10 });

    const imported = await api.post(`/books/${book.id}/stock`, { type: 'IMPORT', quantity: 5 });
    expect(imported.body.data).toMatchObject({ previousStock: 10, stock: 15, change: 5 });

    const adjusted = await api.post(`/books/${book.id}/stock`, {
      type: 'ADJUST',
      newStock: 12,
      note: 'Kiểm kê: hỏng 3 cuốn',
    });
    expect(adjusted.body.data).toMatchObject({ stock: 12, change: -3 });

    const logs = await api.get(`/inventory-logs?bookId=${book.id}`);
    expect(
      logs.body.data.map((l: { reason: string; change: number }) => [l.reason, l.change]),
    ).toEqual([
      ['ADJUST', -3],
      ['IMPORT', 5],
      ['IMPORT', 10],
    ]);
  });

  it('điều chỉnh: thiếu lý do → 422; không đổi → 400; nhập số âm → 422', async () => {
    const book = await createBook({ initialStock: 10 });
    expect(
      (await api.post(`/books/${book.id}/stock`, { type: 'ADJUST', newStock: 5 })).status,
    ).toBe(422);
    const same = await api.post(`/books/${book.id}/stock`, {
      type: 'ADJUST',
      newStock: 10,
      note: 'x',
    });
    expect(same.body.error.code).toBe('STOCK_UNCHANGED');
    expect(
      (await api.post(`/books/${book.id}/stock`, { type: 'IMPORT', quantity: -1 })).status,
    ).toBe(422);
  });

  it('10 lần nhập hàng đồng thời → tồn kho cộng đúng (khoá dòng)', async () => {
    const book = await createBook({ initialStock: 0 });
    await Promise.all(
      Array.from({ length: 10 }, () =>
        api.post(`/books/${book.id}/stock`, { type: 'IMPORT', quantity: 1 }),
      ),
    );
    expect((await api.get(`/books/${book.id}`)).body.data.stock).toBe(10);
    expect((await api.get(`/inventory-logs?bookId=${book.id}`)).body.meta.total).toBe(10);
  });
});

describe('Upload ảnh', () => {
  it('ảnh hợp lệ → trả về url & publicId', async () => {
    const res = await request(app)
      .post('/api/admin/uploads/images')
      .set('Authorization', admin)
      .attach('files', PNG_BYTES, { filename: 'a.png', contentType: 'image/png' })
      .attach('files', PNG_BYTES, { filename: 'b.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toEqual({ url: expect.any(String), publicId: expect.any(String) });
  });

  it('khai báo là ảnh nhưng nội dung không phải ảnh → 400 INVALID_IMAGE', async () => {
    const res = await request(app)
      .post('/api/admin/uploads/images')
      .set('Authorization', admin)
      .attach('files', Buffer.from('<script>alert(1)</script>'), {
        filename: 'x.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IMAGE');
  });

  it('sai định dạng (pdf) → 400; không có file → 400', async () => {
    const pdf = await request(app)
      .post('/api/admin/uploads/images')
      .set('Authorization', admin)
      .attach('files', Buffer.from('%PDF-1.4'), {
        filename: 'x.pdf',
        contentType: 'application/pdf',
      });
    expect(pdf.status).toBe(400);

    const empty = await request(app).post('/api/admin/uploads/images').set('Authorization', admin);
    expect(empty.status).toBe(400);
  });
});

describe('Xoá danh mục — thông báo rõ lý do', () => {
  it('còn danh mục con / còn sách → 409 kèm lý do cụ thể', async () => {
    const root = await createCategory('Gốc');
    const child = await createCategory('Con', root);
    await createBook({ categoryId: child });

    const hasChildren = await api.delete(`/categories/${root}`);
    expect(hasChildren.status).toBe(409);
    expect(hasChildren.body.error.message).toContain('danh mục con');

    const hasBooks = await api.delete(`/categories/${child}`);
    expect(hasBooks.status).toBe(409);
    expect(hasBooks.body.error.message).toContain('1 sách');
  });
});

describe('Bộ lọc mới', () => {
  it('sách: lọc theo ngày thêm (giờ Việt Nam, gồm cả 2 đầu)', async () => {
    const old = await createBook({ title: 'Sách cũ' });
    await createBook({ title: 'Sách mới' });
    // Sách cũ: thêm lúc 23:30 ngày 01/09/2026 giờ Việt Nam (= 16:30 UTC)
    await pool.query(`UPDATE books SET created_at = '2026-09-01T16:30:00Z' WHERE id = $1`, [
      old.id,
    ]);

    const sept1 = await api.get('/books?createdFrom=2026-09-01&createdTo=2026-09-01');
    expect(sept1.body.data.map((b: { title: string }) => b.title)).toEqual(['Sách cũ']);

    const fromSept2 = await api.get('/books?createdFrom=2026-09-02');
    expect(fromSept2.body.data.map((b: { title: string }) => b.title)).toEqual(['Sách mới']);
  });

  it('sách: lọc khoảng giá bán (gồm cả 2 đầu)', async () => {
    await createBook({ title: 'Rẻ', originalPrice: 50000, price: 50000 });
    await createBook({ title: 'Vừa', originalPrice: 100000, price: 80000 });
    await createBook({ title: 'Đắt', originalPrice: 300000, price: 300000 });

    const res = await api.get('/books?minPrice=50000&maxPrice=80000&sort=price_asc');
    expect(res.body.data.map((b: { title: string }) => b.title)).toEqual(['Rẻ', 'Vừa']);
  });

  it('sách: lọc theo tác giả / nhà xuất bản', async () => {
    const authorId = await createAuthor('Nguyễn Nhật Ánh');
    const publisherId = await createPublisher('NXB Trẻ');
    const categoryId = await createCategory('Văn học');
    await createBook({ title: 'Của tác giả', categoryId, authorIds: [authorId] });
    await createBook({ title: 'Của NXB', categoryId, publisherId });
    await createBook({ title: 'Sách khác', categoryId });

    const byAuthor = await api.get(`/books?authorId=${authorId}`);
    expect(byAuthor.body.data.map((b: { title: string }) => b.title)).toEqual(['Của tác giả']);

    const byPublisher = await api.get(`/books?publisherId=${publisherId}`);
    expect(byPublisher.body.data.map((b: { title: string }) => b.title)).toEqual(['Của NXB']);
  });

  it('khoảng ngày / khoảng giá ngược → 422', async () => {
    expect((await api.get('/books?createdFrom=2026-10-02&createdTo=2026-10-01')).status).toBe(422);
    expect((await api.get('/books?minPrice=100&maxPrice=50')).status).toBe(422);
  });

  it('lịch sử tồn kho: tìm theo tên sách không dấu', async () => {
    await createBook({ title: 'Đắc Nhân Tâm', initialStock: 5 });
    await createBook({ title: 'Nhà Giả Kim', initialStock: 5 });

    const res = await api.get('/inventory-logs?q=dac nhan');
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].book.name).toBe('Đắc Nhân Tâm');
  });
});
