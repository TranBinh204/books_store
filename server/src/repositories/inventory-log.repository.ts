import { pool, type Queryable } from '../db/pool';
import type { InventoryLog, InventoryReason } from '../types/catalog.types';
import { offsetOf, type PageParams } from '../utils/pagination';

export interface CreateInventoryLogInput {
  bookId: number;
  change: number;
  stockAfter: number;
  reason: InventoryReason;
  orderId?: number | null;
  note?: string | null;
  createdBy?: number | null;
}

export async function insert(
  input: CreateInventoryLogInput,
  db: Queryable = pool,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO inventory_logs (book_id, change, stock_after, reason, order_id, note, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      input.bookId,
      input.change,
      input.stockAfter,
      input.reason,
      input.orderId ?? null,
      input.note ?? null,
      input.createdBy ?? null,
    ],
  );
  return rows[0].id;
}

export interface InventoryLogFilters {
  /** Đã escape ký tự đặc biệt của LIKE */
  keyword?: string;
  bookId?: number;
  reason?: InventoryReason;
  from?: Date;
  to?: Date;
}

export async function list(
  filters: InventoryLogFilters,
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: InventoryLog[]; total: number }> {
  const { rows } = await db.query<InventoryLog & { total: number }>(
    `SELECT l.id,
       json_build_object('id', b.id, 'name', b.title) AS book,
       l.change,
       l.stock_after AS "stockAfter",
       l.reason,
       l.order_id AS "orderId",
       l.note,
       CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object('id', u.id, 'name', u.full_name) END AS "createdBy",
       l.created_at AS "createdAt",
       count(*) OVER()::int AS total
     FROM inventory_logs l
     JOIN books b ON b.id = l.book_id
     LEFT JOIN users u ON u.id = l.created_by
     WHERE ($1::int IS NULL OR l.book_id = $1)
       AND ($2::text IS NULL OR l.reason = $2)
       AND ($3::timestamptz IS NULL OR l.created_at >= $3)
       AND ($4::timestamptz IS NULL OR l.created_at < $4)
       AND ($7::text IS NULL OR lower(f_unaccent(b.title)) LIKE '%' || lower(f_unaccent($7)) || '%')
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $5 OFFSET $6`,
    [
      filters.bookId ?? null,
      filters.reason ?? null,
      filters.from ?? null,
      filters.to ?? null,
      page.limit,
      offsetOf(page),
      filters.keyword ?? null,
    ],
  );
  return {
    items: rows.map(({ total: _total, ...item }) => item),
    total: rows[0]?.total ?? 0,
  };
}
