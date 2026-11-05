import { pool, type Queryable } from '../db/pool';
import type { VoucherStatus } from '../schemas/voucher.schema';
import type {
  AdminVoucher,
  PublicVoucher,
  Voucher,
  VoucherOrderUsage,
} from '../types/voucher.types';
import { offsetOf, type PageParams } from '../utils/pagination';

// Mã giảm giá (M11)

const COLUMNS = `
  v.id, v.code, v.description,
  v.discount_type   AS "discountType",
  v.discount_value  AS "discountValue",
  v.max_discount    AS "maxDiscount",
  v.min_order_value AS "minOrderValue",
  v.start_at        AS "startAt",
  v.end_at          AS "endAt",
  v.usage_limit     AS "usageLimit",
  v.used_count      AS "usedCount",
  v.per_user_limit  AS "perUserLimit",
  v.is_public       AS "isPublic",
  v.is_active       AS "isActive",
  v.created_at      AS "createdAt",
  v.updated_at      AS "updatedAt"
`;

/** Trạng thái hiển thị (quy tắc 13) — tính theo giờ DB */
const STATUS_SQL = `CASE
  WHEN NOT v.is_active THEN 'DISABLED'
  WHEN now() < v.start_at THEN 'UPCOMING'
  WHEN now() >= v.end_at THEN 'EXPIRED'
  WHEN v.usage_limit IS NOT NULL AND v.used_count >= v.usage_limit THEN 'USED_UP'
  ELSE 'ACTIVE' END`;

const ORDER_COUNT_SQL = `(SELECT count(*)::int FROM orders o WHERE o.voucher_id = v.id)`;

/** Mã công khai đang dùng được — sắp hết hạn trước (khối trang chủ) */
export async function findPublic(limit: number, db: Queryable = pool): Promise<PublicVoucher[]> {
  const { rows } = await db.query<PublicVoucher>(
    `SELECT v.code, v.description,
       v.discount_type   AS "discountType",
       v.discount_value  AS "discountValue",
       v.max_discount    AS "maxDiscount",
       v.min_order_value AS "minOrderValue",
       v.end_at          AS "endAt"
     FROM vouchers v
     WHERE v.is_public AND v.is_active AND v.start_at <= now() AND v.end_at > now()
       AND (v.usage_limit IS NULL OR v.used_count < v.usage_limit)
     ORDER BY v.end_at, v.id
     LIMIT $1`,
    [limit],
  );
  return rows;
}

/** Tìm theo mã (đã chuẩn hoá chữ in hoa). `forUpdate` khoá dòng tới hết transaction */
export async function findByCode(
  code: string,
  db: Queryable = pool,
  forUpdate = false,
): Promise<Voucher | null> {
  const { rows } = await db.query<Voucher>(
    `SELECT ${COLUMNS} FROM vouchers v WHERE v.code = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [code],
  );
  return rows[0] ?? null;
}

/** Số đơn (chưa huỷ) khách đang dùng mã này */
export async function countUserUsages(
  voucherId: number,
  userId: number,
  db: Queryable = pool,
): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM voucher_usages WHERE voucher_id = $1 AND user_id = $2',
    [voucherId, userId],
  );
  return rows[0].count;
}

/** Giữ 1 lượt cho đơn (quy tắc 7) — gọi sau khi đã khoá dòng voucher */
export async function useForOrder(
  input: { voucherId: number; userId: number; orderId: number },
  db: Queryable,
) {
  await db.query('INSERT INTO voucher_usages (voucher_id, user_id, order_id) VALUES ($1, $2, $3)', [
    input.voucherId,
    input.userId,
    input.orderId,
  ]);
  await db.query('UPDATE vouchers SET used_count = used_count + 1 WHERE id = $1', [
    input.voucherId,
  ]);
}

/** Huỷ đơn → trả lượt (quy tắc 8). Đơn không dùng mã → không làm gì */
export async function releaseForOrder(orderId: number, db: Queryable) {
  const { rows } = await db.query<{ voucherId: number }>(
    'DELETE FROM voucher_usages WHERE order_id = $1 RETURNING voucher_id AS "voucherId"',
    [orderId],
  );
  if (rows.length === 0) return;
  await db.query('UPDATE vouchers SET used_count = used_count - 1 WHERE id = $1', [
    rows[0].voucherId,
  ]);
}

// ---------- Admin ----------

export async function listForAdmin(
  filters: {
    /** Đã escape ký tự đặc biệt của LIKE */
    keyword?: string;
    status?: VoucherStatus;
    isPublic?: boolean;
  },
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: AdminVoucher[]; total: number }> {
  const { rows } = await db.query<AdminVoucher & { totalRows: number }>(
    `SELECT t.*, count(*) OVER()::int AS "totalRows" FROM (
       SELECT ${COLUMNS}, ${STATUS_SQL} AS status, ${ORDER_COUNT_SQL} AS "orderCount"
       FROM vouchers v
       WHERE ($1::text IS NULL
              OR v.code ILIKE '%' || $1 || '%'
              OR lower(f_unaccent(v.description)) LIKE '%' || lower(f_unaccent($1)) || '%')
         AND ($2::boolean IS NULL OR v.is_public = $2)
     ) t
     WHERE ($3::text IS NULL OR t.status = $3)
     ORDER BY t."createdAt" DESC, t.id DESC
     LIMIT $4 OFFSET $5`,
    [
      filters.keyword ?? null,
      filters.isPublic ?? null,
      filters.status ?? null,
      page.limit,
      offsetOf(page),
    ],
  );
  return {
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
    total: rows[0]?.totalRows ?? 0,
  };
}

export async function findForAdmin(id: number, db: Queryable = pool): Promise<AdminVoucher | null> {
  const { rows } = await db.query<AdminVoucher>(
    `SELECT ${COLUMNS}, ${STATUS_SQL} AS status, ${ORDER_COUNT_SQL} AS "orderCount"
     FROM vouchers v WHERE v.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Khoá dòng để sửa / xoá — 2 Admin sửa cùng lúc hoặc khách đang dùng mã phải chờ nhau */
export async function lockById(id: number, db: Queryable): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM vouchers WHERE id = $1 FOR UPDATE', [id]);
  return (rowCount ?? 0) > 0;
}

export async function countOrders(id: number, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM orders WHERE voucher_id = $1',
    [id],
  );
  return rows[0].count;
}

export type VoucherRow = Omit<Voucher, 'id' | 'usedCount' | 'createdAt' | 'updatedAt'>;

const WRITE_PARAMS = (v: VoucherRow) => [
  v.code,
  v.description,
  v.discountType,
  v.discountValue,
  v.maxDiscount,
  v.minOrderValue,
  v.startAt,
  v.endAt,
  v.usageLimit,
  v.perUserLimit,
  v.isPublic,
  v.isActive,
];

export async function insert(input: VoucherRow, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO vouchers (code, description, discount_type, discount_value, max_discount,
                           min_order_value, start_at, end_at, usage_limit, per_user_limit,
                           is_public, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    WRITE_PARAMS(input),
  );
  return rows[0].id;
}

export async function update(id: number, input: VoucherRow, db: Queryable = pool) {
  await db.query(
    `UPDATE vouchers SET code = $1, description = $2, discount_type = $3, discount_value = $4,
       max_discount = $5, min_order_value = $6, start_at = $7, end_at = $8, usage_limit = $9,
       per_user_limit = $10, is_public = $11, is_active = $12
     WHERE id = $13`,
    [...WRITE_PARAMS(input), id],
  );
}

export async function remove(id: number, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM vouchers WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

/** Các đơn đã dùng mã (gồm đơn đã huỷ), mới nhất trước */
export async function listOrders(
  id: number,
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: VoucherOrderUsage[]; total: number }> {
  const { rows } = await db.query<VoucherOrderUsage & { totalRows: number }>(
    `SELECT o.id AS "orderId", o.code AS "orderCode", o.status,
       o.discount_amount AS "discountAmount", o.total, o.created_at AS "createdAt",
       json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) AS customer,
       count(*) OVER()::int AS "totalRows"
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.voucher_id = $1
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $2 OFFSET $3`,
    [id, page.limit, offsetOf(page)],
  );
  return {
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
    total: rows[0]?.totalRows ?? 0,
  };
}
