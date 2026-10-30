import { pool, type Queryable } from '../db/pool';
import { offsetOf, type PageParams } from '../utils/pagination';
import {
  PUBLIC_BOOKS_FROM,
  PUBLIC_BOOKS_VISIBLE,
  PUBLIC_COLUMNS,
  type PublicBookRow,
} from './book.repository';

// Sách yêu thích (M09)

export type WishlistRow = PublicBookRow & { isAvailable: boolean; addedAt: Date };

/** Mới lưu trước — kể cả sách đã bị ẩn (isAvailable = false, quy tắc 5) */
export async function listByUser(
  userId: number,
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: WishlistRow[]; total: number }> {
  const { rows } = await db.query<WishlistRow & { totalRows: number }>(
    `SELECT ${PUBLIC_COLUMNS},
       (${PUBLIC_BOOKS_VISIBLE}) AS "isAvailable",
       w.created_at AS "addedAt",
       count(*) OVER()::int AS "totalRows"
     FROM wishlists w
     JOIN ${PUBLIC_BOOKS_FROM} ON b.id = w.book_id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC, w.book_id DESC
     LIMIT $2 OFFSET $3`,
    [userId, page.limit, offsetOf(page)],
  );
  return {
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
    total: rows[0]?.totalRows ?? 0,
  };
}

/** Toàn bộ id sách đã thích (client tô ♥ trên thẻ sách) */
export async function listBookIds(userId: number, db: Queryable = pool): Promise<number[]> {
  const { rows } = await db.query<{ bookId: number }>(
    'SELECT book_id AS "bookId" FROM wishlists WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return rows.map((row) => row.bookId);
}

export async function countByUser(userId: number, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM wishlists WHERE user_id = $1',
    [userId],
  );
  return rows[0].count;
}

export async function exists(userId: number, bookId: number, db: Queryable = pool) {
  const { rowCount } = await db.query(
    'SELECT 1 FROM wishlists WHERE user_id = $1 AND book_id = $2',
    [userId, bookId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Khoá danh sách yêu thích của 1 người tới hết transaction — 2 lần thêm song song
 * không vượt giới hạn (giống giỏ hàng M05)
 */
export async function lockUser(userId: number, db: Queryable) {
  await db.query(`SELECT pg_advisory_xact_lock(hashtext('wishlist:' || $1::text))`, [userId]);
}

export async function insert(userId: number, bookId: number, db: Queryable = pool) {
  await db.query(
    'INSERT INTO wishlists (user_id, book_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, bookId],
  );
}

export async function remove(userId: number, bookId: number, db: Queryable = pool) {
  await db.query('DELETE FROM wishlists WHERE user_id = $1 AND book_id = $2', [userId, bookId]);
}
