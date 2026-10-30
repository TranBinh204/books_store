import { pool, type Queryable } from '../db/pool';

export interface CartLine {
  bookId: number;
  quantity: number;
}

/** Sách thêm mới nhất ở trên */
export async function listByUser(userId: number, db: Queryable = pool): Promise<CartLine[]> {
  const { rows } = await db.query<CartLine>(
    `SELECT book_id AS "bookId", quantity FROM cart_items
     WHERE user_id = $1 ORDER BY created_at DESC, book_id DESC`,
    [userId],
  );
  return rows;
}

/**
 * Khoá giỏ của 1 người dùng tới hết transaction — các thao tác thêm / gộp chạy lần lượt
 * (đúng giới hạn số đầu sách & cộng dồn không bị mất khi bấm nhanh nhiều lần).
 */
export async function lockUser(userId: number, db: Queryable) {
  await db.query(`SELECT pg_advisory_xact_lock(hashtext('cart:' || $1::text))`, [userId]);
}

/** Thêm mới hoặc đặt lại số lượng 1 dòng */
export async function upsert(
  userId: number,
  bookId: number,
  quantity: number,
  db: Queryable = pool,
) {
  await db.query(
    `INSERT INTO cart_items (user_id, book_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, book_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
    [userId, bookId, quantity],
  );
}

/** Đặt số lượng dòng đã có. Trả về false nếu sách không có trong giỏ */
export async function updateQuantity(
  userId: number,
  bookId: number,
  quantity: number,
  db: Queryable = pool,
) {
  const { rowCount } = await db.query(
    'UPDATE cart_items SET quantity = $3 WHERE user_id = $1 AND book_id = $2',
    [userId, bookId, quantity],
  );
  return (rowCount ?? 0) > 0;
}

export async function remove(userId: number, bookId: number, db: Queryable = pool) {
  const { rowCount } = await db.query(
    'DELETE FROM cart_items WHERE user_id = $1 AND book_id = $2',
    [userId, bookId],
  );
  return (rowCount ?? 0) > 0;
}

/** Xoá các sách vừa đặt hàng khỏi giỏ */
export async function removeBooks(userId: number, bookIds: number[], db: Queryable = pool) {
  await db.query('DELETE FROM cart_items WHERE user_id = $1 AND book_id = ANY($2::int[])', [
    userId,
    bookIds,
  ]);
}

export async function clear(userId: number, db: Queryable = pool) {
  await db.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
}
