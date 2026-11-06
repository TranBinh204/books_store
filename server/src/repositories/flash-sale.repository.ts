import { pool, type Queryable } from '../db/pool';
import type { FlashSaleStatus } from '../schemas/flash-sale.schema';
import type {
  AdminFlashSale,
  AdminFlashSaleItem,
  UpcomingFlashSale,
} from '../types/flash-sale.types';
import { offsetOf, type PageParams } from '../utils/pagination';
import {
  PUBLIC_BOOKS_FROM,
  PUBLIC_BOOKS_VISIBLE,
  PUBLIC_COLUMNS,
  type PublicBookRow,
} from './book.repository';

// Flash Sale (M12)

// ---------- Cửa hàng ----------

export interface ActiveFlashSale {
  id: number;
  name: string;
  startAt: Date;
  endAt: Date;
}

/** Chương trình đang chạy (bật + trong giờ) — tối đa 1 vì không chồng giờ */
export async function findCurrent(db: Queryable = pool): Promise<ActiveFlashSale | null> {
  const { rows } = await db.query<ActiveFlashSale>(
    `SELECT id, name, start_at AS "startAt", end_at AS "endAt"
     FROM flash_sales
     WHERE is_active AND start_at <= now() AND end_at > now()
     ORDER BY start_at DESC
     LIMIT 1`,
  );
  return rows[0] ?? null;
}

/** Chương trình bật, sắp bắt đầu sớm nhất (chưa tới giờ) */
export async function findUpcoming(db: Queryable = pool): Promise<UpcomingFlashSale | null> {
  const { rows } = await db.query<UpcomingFlashSale>(
    `SELECT fs.id, fs.name, fs.start_at AS "startAt", fs.end_at AS "endAt",
            (SELECT COUNT(*)::int FROM flash_sale_items WHERE flash_sale_id = fs.id) AS "itemCount"
     FROM flash_sales fs
     WHERE fs.is_active AND fs.start_at > now()
     ORDER BY fs.start_at
     LIMIT 1`,
  );
  return rows[0] ?? null;
}

/** Sách (đang hiện trên cửa hàng) của chương trình, gồm cả sách đã hết suất */
export async function listCurrentBooks(
  flashSaleId: number,
  db: Queryable = pool,
): Promise<PublicBookRow[]> {
  const { rows } = await db.query<PublicBookRow>(
    `SELECT ${PUBLIC_COLUMNS}
     FROM flash_sale_items fsi
     JOIN ${PUBLIC_BOOKS_FROM} ON b.id = fsi.book_id
     WHERE fsi.flash_sale_id = $1 AND ${PUBLIC_BOOKS_VISIBLE} AND fsi.sale_price < b.price
     ORDER BY fsi.id`,
    [flashSaleId],
  );
  return rows;
}

// ---------- Đặt hàng / huỷ đơn ----------

export interface LockedFlashSaleItem {
  id: number;
  salePrice: number;
  quantity: number;
  sold: number;
  perUserLimit: number;
}

/**
 * Trong transaction tạo đơn, SAU khi khoá sách (quy tắc 5): khoá chia sẻ dòng chương trình
 * (Admin sửa / dừng phải chờ) rồi khoá các dòng suất theo thứ tự id — chỉ trả dòng còn hiệu lực.
 */
export async function lockForOrder(
  flashSaleIds: number[],
  itemIds: number[],
  db: Queryable,
): Promise<LockedFlashSaleItem[]> {
  if (itemIds.length === 0) return [];
  await db.query('SELECT 1 FROM flash_sales WHERE id = ANY($1::int[]) ORDER BY id FOR SHARE', [
    flashSaleIds,
  ]);
  const { rows } = await db.query<LockedFlashSaleItem>(
    `SELECT fsi.id, fsi.sale_price AS "salePrice", fsi.quantity, fsi.sold,
       fsi.per_user_limit AS "perUserLimit"
     FROM flash_sale_items fsi JOIN flash_sales fs ON fs.id = fsi.flash_sale_id
     WHERE fsi.id = ANY($1::int[])
       AND fs.is_active AND fs.start_at <= now() AND fs.end_at > now()
     ORDER BY fsi.id
     FOR UPDATE OF fsi`,
    [itemIds],
  );
  return rows;
}

/** Số cuốn khách đã mua giá sale (đơn chưa huỷ) theo từng dòng suất — quy tắc 4 */
export async function countBoughtByUser(
  userId: number,
  itemIds: number[],
  db: Queryable = pool,
): Promise<Map<number, number>> {
  if (itemIds.length === 0) return new Map();
  const { rows } = await db.query<{ itemId: number; quantity: number }>(
    `SELECT oi.flash_sale_item_id AS "itemId", sum(oi.quantity)::int AS quantity
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.user_id = $1 AND o.status <> 'CANCELLED' AND oi.flash_sale_item_id = ANY($2::int[])
     GROUP BY oi.flash_sale_item_id`,
    [userId, itemIds],
  );
  return new Map(rows.map((row) => [row.itemId, row.quantity]));
}

/** Giữ suất (gọi sau `lockForOrder`) */
export async function addSold(itemId: number, quantity: number, db: Queryable) {
  await db.query('UPDATE flash_sale_items SET sold = sold + $2 WHERE id = $1', [itemId, quantity]);
}

/** Huỷ đơn → trả suất cho các dòng mua giá sale (quy tắc 7). Gọi sau khi đã khoá sách */
export async function releaseForOrder(orderId: number, db: Queryable) {
  await db.query(
    `UPDATE flash_sale_items fsi SET sold = fsi.sold - oi.quantity
     FROM order_items oi
     WHERE oi.order_id = $1 AND oi.flash_sale_item_id = fsi.id`,
    [orderId],
  );
}

// ---------- Admin ----------

/** Trạng thái hiển thị (quy tắc 12) — tính theo giờ DB */
const STATUS_SQL = `CASE
  WHEN NOT fs.is_active THEN 'DISABLED'
  WHEN now() < fs.start_at THEN 'UPCOMING'
  WHEN now() >= fs.end_at THEN 'ENDED'
  ELSE 'ACTIVE' END`;

const ADMIN_COLUMNS = `
  fs.id, fs.name,
  fs.start_at   AS "startAt",
  fs.end_at     AS "endAt",
  fs.is_active  AS "isActive",
  ${STATUS_SQL} AS status,
  (SELECT count(*)::int FROM flash_sale_items fsi WHERE fsi.flash_sale_id = fs.id) AS "itemCount",
  (SELECT COALESCE(sum(fsi.quantity), 0)::int FROM flash_sale_items fsi
   WHERE fsi.flash_sale_id = fs.id) AS "totalQuantity",
  (SELECT COALESCE(sum(fsi.sold), 0)::int FROM flash_sale_items fsi
   WHERE fsi.flash_sale_id = fs.id) AS "totalSold",
  (SELECT COALESCE(sum(oi.unit_price * oi.quantity), 0)::bigint
   FROM order_items oi
   JOIN flash_sale_items fsi ON fsi.id = oi.flash_sale_item_id
   JOIN orders o ON o.id = oi.order_id
   WHERE fsi.flash_sale_id = fs.id AND o.status <> 'CANCELLED') AS revenue,
  (SELECT count(DISTINCT oi.order_id)::int
   FROM order_items oi JOIN flash_sale_items fsi ON fsi.id = oi.flash_sale_item_id
   WHERE fsi.flash_sale_id = fs.id) AS "orderCount",
  fs.created_at AS "createdAt",
  fs.updated_at AS "updatedAt"
`;

export async function listForAdmin(
  status: FlashSaleStatus | undefined,
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: AdminFlashSale[]; total: number }> {
  const { rows } = await db.query<AdminFlashSale & { totalRows: number }>(
    `SELECT t.*, count(*) OVER()::int AS "totalRows" FROM (
       SELECT ${ADMIN_COLUMNS} FROM flash_sales fs
     ) t
     WHERE ($1::text IS NULL OR t.status = $1)
     ORDER BY t."startAt" DESC, t.id DESC
     LIMIT $2 OFFSET $3`,
    [status ?? null, page.limit, offsetOf(page)],
  );
  return {
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
    total: rows[0]?.totalRows ?? 0,
  };
}

export async function findForAdmin(
  id: number,
  db: Queryable = pool,
): Promise<AdminFlashSale | null> {
  const { rows } = await db.query<AdminFlashSale>(
    `SELECT ${ADMIN_COLUMNS} FROM flash_sales fs WHERE fs.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listItemsForAdmin(
  flashSaleId: number,
  db: Queryable = pool,
): Promise<AdminFlashSaleItem[]> {
  const { rows } = await db.query<AdminFlashSaleItem>(
    `SELECT fsi.id,
       json_build_object(
         'id', b.id, 'title', b.title,
         'coverUrl', (SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id
                      ORDER BY bi.sort_order LIMIT 1),
         'originalPrice', b.original_price, 'price', b.price, 'stock', b.stock,
         'isActive', b.is_active) AS book,
       fsi.sale_price     AS "salePrice",
       fsi.quantity, fsi.sold,
       fsi.per_user_limit AS "perUserLimit",
       (SELECT count(*)::int FROM order_items oi WHERE oi.flash_sale_item_id = fsi.id) AS "orderCount"
     FROM flash_sale_items fsi JOIN books b ON b.id = fsi.book_id
     WHERE fsi.flash_sale_id = $1
     ORDER BY fsi.id`,
    [flashSaleId],
  );
  return rows;
}

/** Admin tạo / sửa / dừng / xoá chạy lần lượt — chống 2 chương trình chồng giờ (Q1) */
export async function lockAdminWrites(db: Queryable) {
  await db.query(`SELECT pg_advisory_xact_lock(hashtext('flash_sales'))`);
}

/** Khoá dòng chương trình để sửa — khách đang đặt hàng (FOR SHARE) phải xong trước */
export async function lockById(id: number, db: Queryable): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM flash_sales WHERE id = $1 FOR UPDATE', [id]);
  return (rowCount ?? 0) > 0;
}

/** Chương trình đang bật đầu tiên chồng giờ với [startAt, endAt) */
export async function findOverlap(
  startAt: Date,
  endAt: Date,
  excludeId: number | null,
  db: Queryable,
): Promise<{ name: string; startAt: Date; endAt: Date } | null> {
  const { rows } = await db.query<{ name: string; startAt: Date; endAt: Date }>(
    `SELECT name, start_at AS "startAt", end_at AS "endAt" FROM flash_sales
     WHERE is_active AND start_at < $2 AND end_at > $1 AND ($3::int IS NULL OR id <> $3)
     ORDER BY start_at
     LIMIT 1`,
    [startAt, endAt, excludeId],
  );
  return rows[0] ?? null;
}

export interface FlashSaleFields {
  name: string;
  startAt: Date;
  endAt: Date;
  isActive: boolean;
}

export async function insert(input: FlashSaleFields, db: Queryable): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO flash_sales (name, start_at, end_at, is_active) VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [input.name, input.startAt, input.endAt, input.isActive],
  );
  return rows[0].id;
}

export async function update(id: number, input: FlashSaleFields, db: Queryable) {
  await db.query(
    // Đổi giờ bắt đầu → job "sắp diễn ra" báo lại theo giờ mới (M13 quy tắc 7)
    `UPDATE flash_sales SET name = $2, start_at = $3, end_at = $4, is_active = $5,
       upcoming_notified_at = CASE WHEN start_at = $3 THEN upcoming_notified_at END
     WHERE id = $1`,
    [id, input.name, input.startAt, input.endAt, input.isActive],
  );
}

export async function setActive(id: number, isActive: boolean, db: Queryable) {
  await db.query('UPDATE flash_sales SET is_active = $2 WHERE id = $1', [id, isActive]);
}

export async function remove(id: number, db: Queryable) {
  await db.query('DELETE FROM flash_sales WHERE id = $1', [id]);
}

export interface FlashSaleItemFields {
  bookId: number;
  salePrice: number;
  quantity: number;
  perUserLimit: number;
}

export async function insertItems(
  flashSaleId: number,
  items: FlashSaleItemFields[],
  db: Queryable,
) {
  if (items.length === 0) return;
  await db.query(
    `INSERT INTO flash_sale_items (flash_sale_id, book_id, sale_price, quantity, per_user_limit)
     SELECT $1, * FROM unnest($2::int[], $3::bigint[], $4::int[], $5::int[])`,
    [
      flashSaleId,
      items.map((item) => item.bookId),
      items.map((item) => item.salePrice),
      items.map((item) => item.quantity),
      items.map((item) => item.perUserLimit),
    ],
  );
}

export async function updateItem(id: number, item: FlashSaleItemFields, db: Queryable) {
  await db.query(
    'UPDATE flash_sale_items SET sale_price = $2, quantity = $3, per_user_limit = $4 WHERE id = $1',
    [id, item.salePrice, item.quantity, item.perUserLimit],
  );
}

export async function removeItems(ids: number[], db: Queryable) {
  if (ids.length === 0) return;
  await db.query('DELETE FROM flash_sale_items WHERE id = ANY($1::int[])', [ids]);
}

export interface FlashSaleBookInfo {
  id: number;
  title: string;
  price: number;
  stock: number;
  isActive: boolean;
}

/** Giá bán, tồn kho & trạng thái hiện tại của các sách (kiểm tra quy tắc 2, 9) */
export async function findBooks(ids: number[], db: Queryable): Promise<FlashSaleBookInfo[]> {
  const { rows } = await db.query<FlashSaleBookInfo>(
    'SELECT id, title, price, stock, is_active AS "isActive" FROM books WHERE id = ANY($1::int[])',
    [ids],
  );
  return rows;
}
