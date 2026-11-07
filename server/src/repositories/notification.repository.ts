import { pool, type Queryable } from '../db/pool';
import type { NewNotification, Notification } from '../types/notification.types';
import { offsetOf, type PageParams } from '../utils/pagination';

// Thông báo cho khách hàng (M13)

/** Ghi 1 thông báo — trùng (khách, dedupe_key) thì bỏ qua (quy tắc 4) */
export async function insertMany(items: NewNotification[], db: Queryable = pool) {
  if (items.length === 0) return;
  await db.query(
    `INSERT INTO notifications (user_id, type, event, title, content, link, dedupe_key)
     SELECT * FROM unnest($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
                          $7::text[])
     ON CONFLICT (user_id, dedupe_key) DO NOTHING`,
    [
      items.map((item) => item.userId),
      items.map((item) => item.type),
      items.map((item) => item.event),
      items.map((item) => item.title),
      items.map((item) => item.content),
      items.map((item) => item.link),
      items.map((item) => item.dedupeKey),
    ],
  );
}

const COLUMNS = `
  id, type, event, title, content, link,
  is_read    AS "isRead",
  created_at AS "createdAt"
`;

export async function listByUser(
  userId: number,
  unreadOnly: boolean,
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: Notification[]; total: number }> {
  const { rows } = await db.query<Notification & { totalRows: number }>(
    `SELECT ${COLUMNS}, count(*) OVER()::int AS "totalRows"
     FROM notifications
     WHERE user_id = $1 AND (NOT $2::boolean OR NOT is_read)
     ORDER BY created_at DESC, id DESC
     LIMIT $3 OFFSET $4`,
    [userId, unreadOnly, page.limit, offsetOf(page)],
  );
  return {
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
    total: rows[0]?.totalRows ?? 0,
  };
}

export async function countUnread(userId: number, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND NOT is_read',
    [userId],
  );
  return rows[0].count;
}

/** Đánh dấu đã đọc — false nếu không có / không phải của khách */
export async function markRead(userId: number, id: number, db: Queryable = pool) {
  const { rowCount } = await db.query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
}

/** Đánh dấu tất cả đã đọc — chỉ thông báo tạo tới lúc bấm (quy tắc 5) */
export async function markAllRead(userId: number, until: Date, db: Queryable = pool) {
  const { rowCount } = await db.query(
    `UPDATE notifications SET is_read = true
     WHERE user_id = $1 AND NOT is_read AND created_at <= $2`,
    [userId, until],
  );
  return rowCount ?? 0;
}

/** Xoá thông báo cũ hơn `days` ngày (quy tắc 9) — trả số dòng đã xoá */
export async function purgeOlderThan(days: number, db: Queryable = pool) {
  const { rowCount } = await db.query(
    `DELETE FROM notifications WHERE created_at < now() - make_interval(days => $1::int)`,
    [days],
  );
  return rowCount ?? 0;
}

// ---------- Dữ liệu dựng nội dung thông báo ----------

export interface OrderNotifyInfo {
  userId: number;
  code: string;
  total: number;
  paymentMethod: 'COD' | 'VNPAY';
  paymentDueAt: Date | null;
  itemCount: number;
}

export async function findOrderInfo(
  orderId: number,
  db: Queryable = pool,
): Promise<OrderNotifyInfo | null> {
  const { rows } = await db.query<OrderNotifyInfo>(
    `SELECT o.user_id AS "userId", o.code, o.total,
       o.payment_method AS "paymentMethod", o.payment_due_at AS "paymentDueAt",
       (SELECT COALESCE(sum(oi.quantity), 0)::int FROM order_items oi WHERE oi.order_id = o.id)
         AS "itemCount"
     FROM orders o WHERE o.id = $1`,
    [orderId],
  );
  return rows[0] ?? null;
}

export interface UpcomingFlashSale {
  id: number;
  startAt: Date;
}

/** Chương trình đang bật sắp bắt đầu trong `minutes` phút và chưa báo — khoá, bỏ qua dòng đang khoá */
export async function lockUpcomingFlashSales(
  minutes: number,
  db: Queryable,
): Promise<UpcomingFlashSale[]> {
  const { rows } = await db.query<UpcomingFlashSale>(
    `SELECT id, start_at AS "startAt" FROM flash_sales
     WHERE is_active AND upcoming_notified_at IS NULL
       AND start_at > now() AND start_at <= now() + make_interval(mins => $1::int)
     ORDER BY start_at
     FOR UPDATE SKIP LOCKED`,
    [minutes],
  );
  return rows;
}

export interface WishlistedFlashBook {
  userId: number;
  bookId: number;
  title: string;
  salePrice: number;
}

/** Khách có sách yêu thích trong chương trình (sách đang bán, giá sale < giá bán) — Q2 */
export async function listWishlistedFlashBooks(
  flashSaleId: number,
  db: Queryable,
): Promise<WishlistedFlashBook[]> {
  const { rows } = await db.query<WishlistedFlashBook>(
    `SELECT w.user_id AS "userId", b.id AS "bookId", b.title, fsi.sale_price AS "salePrice"
     FROM flash_sale_items fsi
     JOIN books b ON b.id = fsi.book_id
     JOIN wishlists w ON w.book_id = fsi.book_id
     JOIN users u ON u.id = w.user_id
     WHERE fsi.flash_sale_id = $1 AND b.is_active AND fsi.sale_price < b.price
       AND u.role = 'CUSTOMER'
     ORDER BY w.user_id, w.created_at DESC`,
    [flashSaleId],
  );
  return rows;
}

export async function markFlashSaleNotified(id: number, db: Queryable) {
  await db.query('UPDATE flash_sales SET upcoming_notified_at = now() WHERE id = $1', [id]);
}
