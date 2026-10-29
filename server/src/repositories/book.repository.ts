import { pool, type Queryable } from '../db/pool';
import type { PublicBookSort } from '../schemas/book-public.schema';
import type { BookSort, UpdateBookInput } from '../schemas/book.schema';
import type {
  BookDetail,
  BookListItem,
  PublicBookDetail,
  PublicBookListItem,
  PublisherFacet,
} from '../types/catalog.types';
import { offsetOf, type PageParams } from '../utils/pagination';

// Thứ tự sắp xếp — chỉ dùng giá trị trong bảng này (không ghép chuỗi từ người dùng vào SQL)
const ORDER_BY: Record<BookSort, string> = {
  created_desc: 'b.created_at DESC',
  created_asc: 'b.created_at ASC',
  title_asc: 'lower(b.title) ASC',
  price_asc: 'b.price ASC',
  price_desc: 'b.price DESC',
  stock_asc: 'b.stock ASC',
  stock_desc: 'b.stock DESC',
  sold_desc: 'b.sold_count DESC',
};

const AUTHORS_JSON = `
  COALESCE((
    SELECT json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY ba.sort_order)
    FROM book_authors ba JOIN authors a ON a.id = ba.author_id
    WHERE ba.book_id = b.id
  ), '[]'::json)
`;

/** Ảnh đại diện = ảnh có sort_order nhỏ nhất */
export const COVER_URL = `(SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id ORDER BY bi.sort_order LIMIT 1)`;

const COMMON_COLUMNS = `
  b.id,
  b.title,
  ${AUTHORS_JSON} AS authors,
  b.original_price AS "originalPrice",
  b.price,
  b.stock,
  b.sold_count AS "soldCount",
  b.is_active AS "isActive",
  b.created_at AS "createdAt",
  b.updated_at AS "updatedAt"
`;

export interface BookListFilters {
  /** Đã escape ký tự đặc biệt của LIKE */
  keyword?: string;
  isbn?: string;
  categoryId?: number;
  authorId?: number;
  publisherId?: number;
  isActive?: boolean;
  stock?: 'low' | 'out';
  lowStockThreshold: number;
  /** Mốc thời gian đã quy đổi: created_at >= createdFrom AND < createdTo */
  createdFrom?: Date;
  createdTo?: Date;
  minPrice?: number;
  maxPrice?: number;
  sort: BookSort;
}

export async function list(
  filters: BookListFilters,
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: Omit<BookListItem, 'stockStatus'>[]; total: number }> {
  const { rows } = await db.query<Omit<BookListItem, 'stockStatus'> & { total: number }>(
    `SELECT ${COMMON_COLUMNS},
       ${COVER_URL} AS "coverUrl",
       json_build_object('id', c.id, 'name', c.name) AS category,
       count(*) OVER()::int AS total
     FROM books b
     JOIN categories c ON c.id = b.category_id
     WHERE ($1::text IS NULL
            OR lower(f_unaccent(b.title)) LIKE '%' || lower(f_unaccent($1)) || '%'
            OR b.isbn = $2)
       AND ($3::int IS NULL OR b.category_id = $3 OR c.parent_id = $3)
       AND ($4::boolean IS NULL OR b.is_active = $4)
       AND ($5::text IS NULL
            OR ($5 = 'out' AND b.stock = 0)
            OR ($5 = 'low' AND b.stock > 0 AND b.stock <= $6))
       AND ($9::timestamptz IS NULL OR b.created_at >= $9)
       AND ($10::timestamptz IS NULL OR b.created_at < $10)
       AND ($11::bigint IS NULL OR b.price >= $11)
       AND ($12::bigint IS NULL OR b.price <= $12)
       AND ($13::int IS NULL
            OR EXISTS (SELECT 1 FROM book_authors ba WHERE ba.book_id = b.id AND ba.author_id = $13))
       AND ($14::int IS NULL OR b.publisher_id = $14)
     ORDER BY ${ORDER_BY[filters.sort]}, b.id DESC
     LIMIT $7 OFFSET $8`,
    [
      filters.keyword ?? null,
      filters.isbn ?? null,
      filters.categoryId ?? null,
      filters.isActive ?? null,
      filters.stock ?? null,
      filters.lowStockThreshold,
      page.limit,
      offsetOf(page),
      filters.createdFrom ?? null,
      filters.createdTo ?? null,
      filters.minPrice ?? null,
      filters.maxPrice ?? null,
      filters.authorId ?? null,
      filters.publisherId ?? null,
    ],
  );
  return {
    items: rows.map(({ total: _total, ...item }) => item),
    total: rows[0]?.total ?? 0,
  };
}

export async function findDetail(
  id: number,
  db: Queryable = pool,
): Promise<Omit<BookDetail, 'stockStatus'> | null> {
  const { rows } = await db.query<Omit<BookDetail, 'stockStatus'>>(
    `SELECT ${COMMON_COLUMNS},
       json_build_object('id', c.id, 'name', c.name, 'parentId', c.parent_id) AS category,
       CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('id', p.id, 'name', p.name) END AS publisher,
       b.isbn,
       b.description,
       b.publish_year AS "publishYear",
       b.pages,
       b.size,
       b.weight_gram AS "weightGram",
       b.cover_type AS "coverType",
       COALESCE((
         SELECT json_agg(json_build_object(
           'id', bi.id, 'url', bi.url, 'publicId', bi.public_id, 'sortOrder', bi.sort_order
         ) ORDER BY bi.sort_order)
         FROM book_images bi WHERE bi.book_id = b.id
       ), '[]'::json) AS images
     FROM books b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN publishers p ON p.id = b.publisher_id
     WHERE b.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function exists(id: number, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM books WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function isbnExists(isbn: string, excludeId?: number, db: Queryable = pool) {
  const { rowCount } = await db.query(
    'SELECT 1 FROM books WHERE isbn = $1 AND ($2::int IS NULL OR id <> $2)',
    [isbn, excludeId ?? null],
  );
  return (rowCount ?? 0) > 0;
}

type BookFields = Omit<UpdateBookInput, 'authorIds' | 'images'>;

const FIELD_VALUES = (input: BookFields) => [
  input.title,
  input.categoryId,
  input.publisherId,
  input.isbn,
  input.description,
  input.publishYear,
  input.pages,
  input.size,
  input.weightGram,
  input.coverType,
  input.originalPrice,
  input.price,
  input.isActive,
];

export async function insert(
  input: BookFields & { stock: number },
  db: Queryable = pool,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO books (title, category_id, publisher_id, isbn, description, publish_year, pages,
                        size, weight_gram, cover_type, original_price, price, is_active, stock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id`,
    [...FIELD_VALUES(input), input.stock],
  );
  return rows[0].id;
}

export async function updateFields(id: number, input: BookFields, db: Queryable = pool) {
  await db.query(
    `UPDATE books SET
       title = $1, category_id = $2, publisher_id = $3, isbn = $4, description = $5,
       publish_year = $6, pages = $7, size = $8, weight_gram = $9, cover_type = $10,
       original_price = $11, price = $12, is_active = $13
     WHERE id = $14`,
    [...FIELD_VALUES(input), id],
  );
}

export async function setActive(id: number, isActive: boolean, db: Queryable = pool) {
  await db.query('UPDATE books SET is_active = $2 WHERE id = $1', [id, isActive]);
}

/** Thay toàn bộ tác giả, giữ thứ tự theo mảng */
export async function replaceAuthors(bookId: number, authorIds: number[], db: Queryable = pool) {
  await db.query('DELETE FROM book_authors WHERE book_id = $1', [bookId]);
  await db.query(
    `INSERT INTO book_authors (book_id, author_id, sort_order)
     SELECT $1, author_id, ord - 1 FROM unnest($2::int[]) WITH ORDINALITY AS t(author_id, ord)`,
    [bookId, authorIds],
  );
}

/** Thay toàn bộ ảnh, giữ thứ tự theo mảng. Trả về publicId các ảnh bị bỏ (để xoá file) */
export async function replaceImages(
  bookId: number,
  images: { url: string; publicId: string }[],
  db: Queryable = pool,
): Promise<string[]> {
  const { rows } = await db.query<{ publicId: string }>(
    'DELETE FROM book_images WHERE book_id = $1 RETURNING public_id AS "publicId"',
    [bookId],
  );
  if (images.length > 0) {
    await db.query(
      `INSERT INTO book_images (book_id, url, public_id, sort_order)
       SELECT $1, url, public_id, ord - 1
       FROM unnest($2::text[], $3::text[]) WITH ORDINALITY AS t(url, public_id, ord)`,
      [bookId, images.map((image) => image.url), images.map((image) => image.publicId)],
    );
  }
  const kept = new Set(images.map((image) => image.publicId));
  return rows.map((row) => row.publicId).filter((publicId) => !kept.has(publicId));
}

/** Khoá dòng sách trong transaction, trả về tồn kho hiện tại (null nếu không có sách) */
export async function lockStock(id: number, db: Queryable): Promise<number | null> {
  const { rows } = await db.query<{ stock: number }>(
    'SELECT stock FROM books WHERE id = $1 FOR UPDATE',
    [id],
  );
  return rows[0]?.stock ?? null;
}

export async function setStock(id: number, stock: number, db: Queryable) {
  await db.query('UPDATE books SET stock = $2 WHERE id = $1', [id, stock]);
}

// ============================================================
// Cửa hàng — API công khai (M03)
// ============================================================

/**
 * Nguồn sách công khai. MỌI truy vấn công khai dùng 2 hằng này để không lộ sách bị ẩn:
 * sách đang bán + danh mục đang hiển thị + (nếu là danh mục con) danh mục cha cũng đang hiển thị.
 */
export const PUBLIC_BOOKS_FROM = `
  books b
  JOIN categories c ON c.id = b.category_id
  LEFT JOIN categories pc ON pc.id = c.parent_id
`;
export const PUBLIC_BOOKS_VISIBLE = 'b.is_active AND c.is_active AND COALESCE(pc.is_active, true)';

/**
 * Flash sale đang chạy của sách `b` (M12 quy tắc 3, CHƯA xét còn suất) — null nếu không có.
 * Các chương trình đang bật không chồng giờ → tối đa 1 dòng.
 */
const FLASH_SALE_JSON = `(
  SELECT json_build_object(
    'itemId', fsi.id, 'flashSaleId', fs.id, 'salePrice', fsi.sale_price,
    'quantity', fsi.quantity, 'sold', fsi.sold, 'perUserLimit', fsi.per_user_limit,
    'endAt', fs.end_at)
  FROM flash_sale_items fsi JOIN flash_sales fs ON fs.id = fsi.flash_sale_id
  WHERE fsi.book_id = b.id AND fs.is_active AND fs.start_at <= now() AND fs.end_at > now()
    AND fsi.sale_price < b.price
  ORDER BY fs.start_at DESC
  LIMIT 1
)`;

export interface FlashSaleRow {
  itemId: number;
  flashSaleId: number;
  salePrice: number;
  quantity: number;
  sold: number;
  perUserLimit: number;
  /** Chuỗi thời gian từ json_build_object */
  endAt: string;
}

/** `stock` chỉ dùng để tính `stockStatus` / `maxQuantity` ở service, không trả ra ngoài */
export const PUBLIC_COLUMNS = `
  b.id,
  b.title,
  ${COVER_URL} AS "coverUrl",
  ${AUTHORS_JSON} AS authors,
  b.original_price AS "originalPrice",
  b.price,
  b.stock,
  b.sold_count AS "soldCount",
  b.rating_avg::float AS "ratingAvg",
  b.rating_count AS "ratingCount",
  b.created_at AS "createdAt",
  ${FLASH_SALE_JSON} AS "flashSale"
`;

export type PublicBookRow = Omit<
  PublicBookListItem,
  'discountPercent' | 'stockStatus' | 'flashSale' | 'isNew'
> & {
  stock: number;
  createdAt: Date;
  flashSale: FlashSaleRow | null;
};
export type PublicBookDetailRow = Omit<
  PublicBookDetail,
  'discountPercent' | 'stockStatus' | 'maxQuantity' | 'flashSale' | 'isNew'
> & { stock: number; createdAt: Date; flashSale: FlashSaleRow | null };

// $1 = từ khoá (đã escape LIKE), so không dấu với tên sách / tên tác giả; $2 = ISBN đã chuẩn hoá
const TITLE_UNACCENT = 'lower(f_unaccent(b.title))';
const KEYWORD_UNACCENT = 'lower(f_unaccent($1))';

/** Liên quan nhất: trùng ISBN / tên bắt đầu bằng từ khoá → tên chứa từ khoá → khớp tác giả */
const RELEVANCE_RANK = `
  CASE
    WHEN b.isbn = $2 OR ${TITLE_UNACCENT} LIKE ${KEYWORD_UNACCENT} || '%' THEN 0
    WHEN ${TITLE_UNACCENT} LIKE '%' || ${KEYWORD_UNACCENT} || '%' THEN 1
    ELSE 2
  END
`;

const PUBLIC_ORDER_BY: Record<PublicBookSort, string> = {
  created_desc: 'b.created_at DESC',
  created_asc: 'b.created_at ASC',
  sold_desc: 'b.sold_count DESC',
  price_asc: 'b.price ASC',
  price_desc: 'b.price DESC',
  title_asc: 'lower(b.title) ASC',
  title_desc: 'lower(b.title) DESC',
  relevance: `${RELEVANCE_RANK} ASC, b.sold_count DESC`,
};

export interface PublicBookFilters {
  /** Đã escape ký tự đặc biệt của LIKE */
  keyword?: string;
  isbn?: string;
  categoryId?: number;
  authorId?: number;
  publisherIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  sort: PublicBookSort;
}

export async function listPublic(
  filters: PublicBookFilters,
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: PublicBookRow[]; total: number }> {
  const { rows } = await db.query<PublicBookRow & { total: number }>(
    `SELECT ${PUBLIC_COLUMNS}, count(*) OVER()::int AS total
     FROM ${PUBLIC_BOOKS_FROM}
     WHERE ${PUBLIC_BOOKS_VISIBLE}
       AND ($1::text IS NULL
            OR ${TITLE_UNACCENT} LIKE '%' || ${KEYWORD_UNACCENT} || '%'
            OR b.isbn = $2
            OR EXISTS (
              SELECT 1 FROM book_authors ba JOIN authors a ON a.id = ba.author_id
              WHERE ba.book_id = b.id
                AND lower(f_unaccent(a.name)) LIKE '%' || ${KEYWORD_UNACCENT} || '%'
            ))
       AND ($3::int IS NULL OR b.category_id = $3 OR c.parent_id = $3)
       AND ($4::int IS NULL
            OR EXISTS (SELECT 1 FROM book_authors ba WHERE ba.book_id = b.id AND ba.author_id = $4))
       AND ($5::int[] IS NULL OR b.publisher_id = ANY($5::int[]))
       AND ($6::bigint IS NULL OR b.price >= $6)
       AND ($7::bigint IS NULL OR b.price <= $7)
     ORDER BY ${PUBLIC_ORDER_BY[filters.sort]}, b.id DESC
     LIMIT $8 OFFSET $9`,
    [
      filters.keyword ?? null,
      filters.isbn ?? null,
      filters.categoryId ?? null,
      filters.authorId ?? null,
      filters.publisherIds ?? null,
      filters.minPrice ?? null,
      filters.maxPrice ?? null,
      page.limit,
      offsetOf(page),
    ],
  );
  return {
    items: rows.map(({ total: _total, ...item }) => item),
    total: rows[0]?.total ?? 0,
  };
}

export async function findPublicDetail(
  id: number,
  db: Queryable = pool,
): Promise<PublicBookDetailRow | null> {
  const { rows } = await db.query<PublicBookDetailRow>(
    `SELECT ${PUBLIC_COLUMNS},
       json_build_object(
         'id', c.id,
         'name', c.name,
         'parent', CASE WHEN pc.id IS NULL THEN NULL
                        ELSE json_build_object('id', pc.id, 'name', pc.name) END
       ) AS category,
       CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('id', p.id, 'name', p.name) END AS publisher,
       b.isbn,
       b.description,
       b.publish_year AS "publishYear",
       b.pages,
       b.size,
       b.weight_gram AS "weightGram",
       b.cover_type AS "coverType",
       b.rating_avg::float AS "ratingAvg",
       b.rating_count AS "ratingCount",
       COALESCE((
         SELECT json_agg(json_build_object('id', bi.id, 'url', bi.url, 'sortOrder', bi.sort_order)
                         ORDER BY bi.sort_order)
         FROM book_images bi WHERE bi.book_id = b.id
       ), '[]'::json) AS images
     FROM ${PUBLIC_BOOKS_FROM}
     LEFT JOIN publishers p ON p.id = b.publisher_id
     WHERE b.id = $1 AND ${PUBLIC_BOOKS_VISIBLE}`,
    [id],
  );
  return rows[0] ?? null;
}

/** Danh mục của sách nếu sách đang hiện trên cửa hàng; ẩn / không có → null */
export async function findPublicCategoryId(id: number, db: Queryable = pool) {
  const { rows } = await db.query<{ categoryId: number }>(
    `SELECT b.category_id AS "categoryId" FROM ${PUBLIC_BOOKS_FROM}
     WHERE b.id = $1 AND ${PUBLIC_BOOKS_VISIBLE}`,
    [id],
  );
  return rows[0]?.categoryId ?? null;
}

/** Sách liên quan: cùng danh mục, không gồm chính nó, ưu tiên có chung tác giả rồi bán chạy */
export async function listRelated(
  bookId: number,
  categoryId: number,
  limit: number,
  db: Queryable = pool,
): Promise<PublicBookRow[]> {
  const { rows } = await db.query<PublicBookRow>(
    `SELECT ${PUBLIC_COLUMNS}
     FROM ${PUBLIC_BOOKS_FROM}
     WHERE ${PUBLIC_BOOKS_VISIBLE} AND b.category_id = $2 AND b.id <> $1
     ORDER BY EXISTS (
                SELECT 1 FROM book_authors mine
                JOIN book_authors theirs ON theirs.author_id = mine.author_id
                WHERE mine.book_id = $1 AND theirs.book_id = b.id
              ) DESC,
              b.sold_count DESC, b.id DESC
     LIMIT $3`,
    [bookId, categoryId, limit],
  );
  return rows;
}

export interface CartBookRow {
  id: number;
  title: string;
  coverUrl: string | null;
  originalPrice: number;
  price: number;
  stock: number;
  /** Đang hiện trên cửa hàng (quy tắc hiển thị M03) */
  isAvailable: boolean;
  /** Flash sale đang chạy (M12) — chưa xét còn suất / giới hạn / người */
  flashSale: FlashSaleRow | null;
}

const CART_BOOK_COLUMNS = `
  b.id, b.title, ${COVER_URL} AS "coverUrl",
  b.original_price AS "originalPrice", b.price, b.stock,
  (${PUBLIC_BOOKS_VISIBLE}) AS "isAvailable",
  ${FLASH_SALE_JSON} AS "flashSale"
`;

/**
 * Giỏ hàng (M05): thông tin hiện tại của nhiều sách theo id — gồm CẢ sách đã ẩn
 * (`isAvailable = false`) để giỏ vẫn hiện tên + cảnh báo "ngừng kinh doanh". id không có → bỏ qua.
 */
export async function findCartBooks(ids: number[], db: Queryable = pool): Promise<CartBookRow[]> {
  if (ids.length === 0) return [];
  const { rows } = await db.query<CartBookRow>(
    `SELECT ${CART_BOOK_COLUMNS}
     FROM ${PUBLIC_BOOKS_FROM}
     WHERE b.id = ANY($1::int[])`,
    [ids],
  );
  return rows;
}

/**
 * Đặt hàng (M06): khoá các dòng sách FOR UPDATE theo thứ tự id (nhiều đơn cùng lúc khoá
 * cùng thứ tự → không deadlock) và trả thông tin hiện tại. Gọi trong transaction tạo đơn.
 */
export async function lockForOrder(ids: number[], db: Queryable): Promise<CartBookRow[]> {
  const { rows } = await db.query<CartBookRow>(
    `SELECT ${CART_BOOK_COLUMNS}
     FROM ${PUBLIC_BOOKS_FROM}
     WHERE b.id = ANY($1::int[])
     ORDER BY b.id
     FOR UPDATE OF b`,
    [ids],
  );
  return rows;
}

/**
 * Đặt hàng: trừ tồn `quantity` & cộng số đã bán · huỷ đơn: `quantity` âm → hoàn tồn & trừ số đã bán.
 * Trả về tồn kho sau thay đổi (gọi sau khi đã khoá dòng sách).
 */
export async function applyOrderQuantity(id: number, quantity: number, db: Queryable) {
  const { rows } = await db.query<{ stock: number }>(
    `UPDATE books SET stock = stock - $2, sold_count = GREATEST(sold_count + $2, 0)
     WHERE id = $1 RETURNING stock`,
    [id, quantity],
  );
  return rows[0].stock;
}

/** NXB có sách đang bán trong danh mục (danh mục cha gồm cả con), kèm số sách */
export async function listPublisherFacets(
  categoryId: number,
  db: Queryable = pool,
): Promise<PublisherFacet[]> {
  const { rows } = await db.query<PublisherFacet>(
    `SELECT p.id, p.name, count(*)::int AS "bookCount"
     FROM ${PUBLIC_BOOKS_FROM}
     JOIN publishers p ON p.id = b.publisher_id
     WHERE ${PUBLIC_BOOKS_VISIBLE} AND (b.category_id = $1 OR c.parent_id = $1)
     GROUP BY p.id, p.name
     ORDER BY lower(p.name)`,
    [categoryId],
  );
  return rows;
}
