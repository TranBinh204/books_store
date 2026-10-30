import { pool, type Queryable } from '../db/pool';
import type { OrderStatus, PaymentMethod } from '../schemas/order.schema';
import type { AdminOrderListQuery } from '../schemas/admin-order.schema';
import type {
  AdminOrderDetail,
  AdminOrderRow,
  OrderDetail,
  OrderSummary,
  PaymentStatus,
} from '../types/order.types';
import { offsetOf, type PageParams } from '../utils/pagination';

/**
 * Cấp số thứ tự mã đơn trong năm (giờ Việt Nam) — CHẠY TRONG transaction tạo đơn.
 * INSERT ... ON CONFLICT DO UPDATE khoá dòng của năm → 2 đơn cùng lúc không trùng số;
 * tạo đơn lỗi → rollback → số được trả lại. → "BS-2026-000001"
 */
export async function nextOrderCode(db: Queryable): Promise<string> {
  const { rows } = await db.query<{ year: number; lastNumber: number }>(
    `INSERT INTO order_code_sequences (year, last_number)
     VALUES (EXTRACT(YEAR FROM now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::smallint, 1)
     ON CONFLICT (year) DO UPDATE
       SET last_number = order_code_sequences.last_number + 1, updated_at = now()
     RETURNING year, last_number AS "lastNumber"`,
  );
  const { year, lastNumber } = rows[0];
  return `BS-${year}-${String(lastNumber).padStart(6, '0')}`;
}

export async function findIdByIdempotencyKey(
  userId: number,
  key: string,
  db: Queryable = pool,
): Promise<number | null> {
  const { rows } = await db.query<{ id: number }>(
    'SELECT id FROM orders WHERE user_id = $1 AND idempotency_key = $2',
    [userId, key],
  );
  return rows[0]?.id ?? null;
}

export interface CreateOrderRow {
  code: string;
  userId: number;
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  note: string | null;
  subtotal: number;
  /** Giảm từ voucher (M11) — 0 nếu không dùng mã */
  discountAmount: number;
  voucherId: number | null;
  total: number;
  /** Đơn VNPay: hạn thanh toán = lúc tạo (giờ DB) + số phút này; COD = null */
  paymentTtlMinutes: number | null;
}

export async function insert(input: CreateOrderRow, db: Queryable): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO orders (code, user_id, idempotency_key, payment_method, recipient_name,
                         recipient_phone, shipping_address, note, subtotal, total, payment_due_at,
                         discount_amount, voucher_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             CASE WHEN $11::int IS NULL THEN NULL ELSE now() + make_interval(mins => $11::int) END,
             $12, $13)
     RETURNING id`,
    [
      input.code,
      input.userId,
      input.idempotencyKey,
      input.paymentMethod,
      input.recipientName,
      input.recipientPhone,
      input.shippingAddress,
      input.note,
      input.subtotal,
      input.total,
      input.paymentTtlMinutes,
      input.discountAmount,
      input.voucherId,
    ],
  );
  return rows[0].id;
}

export interface OrderItemRow {
  bookId: number;
  title: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  /** Mua giá Flash Sale (M12) */
  flashSaleItemId: number | null;
}

export async function insertItems(orderId: number, items: OrderItemRow[], db: Queryable) {
  await db.query(
    `INSERT INTO order_items (order_id, book_id, book_title, book_image, unit_price, quantity,
                             flash_sale_item_id)
     SELECT $1, * FROM unnest($2::int[], $3::text[], $4::text[], $5::bigint[], $6::int[], $7::int[])`,
    [
      orderId,
      items.map((item) => item.bookId),
      items.map((item) => item.title),
      items.map((item) => item.image),
      items.map((item) => item.unitPrice),
      items.map((item) => item.quantity),
      items.map((item) => item.flashSaleItemId),
    ],
  );
}

export async function insertHistory(
  orderId: number,
  event: {
    from: OrderStatus | null;
    to: OrderStatus;
    changedBy: number | null;
    note: string | null;
  },
  db: Queryable,
) {
  await db.query(
    `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [orderId, event.from, event.to, event.changedBy, event.note],
  );
}

const ITEM_JSON = `json_build_object(
  'bookId', oi.book_id, 'title', oi.book_title, 'image', oi.book_image,
  'unitPrice', oi.unit_price, 'quantity', oi.quantity, 'lineTotal', oi.unit_price * oi.quantity,
  'isFlashSale', oi.flash_sale_item_id IS NOT NULL
)`;

/** Lịch sử trạng thái; `withActor` kèm người thay đổi (Admin) */
function historyJson(withActor: boolean) {
  const actor = withActor
    ? `, 'changedBy', (SELECT json_build_object('id', cu.id, 'fullName', cu.full_name, 'role', cu.role)
                      FROM users cu WHERE cu.id = h.changed_by)`
    : '';
  return `COALESCE((SELECT json_agg(json_build_object(
              'fromStatus', h.from_status, 'toStatus', h.to_status,
              'note', h.note, 'createdAt', h.created_at${actor}) ORDER BY h.created_at, h.id)
            FROM order_status_history h WHERE h.order_id = o.id), '[]'::json) AS history`;
}

const DETAIL_COLUMNS = `
  o.id, o.code, o.status,
  o.payment_method   AS "paymentMethod",
  o.payment_status   AS "paymentStatus",
  o.recipient_name   AS "recipientName",
  o.recipient_phone  AS "recipientPhone",
  o.shipping_address AS "shippingAddress",
  o.note, o.subtotal,
  o.shipping_fee     AS "shippingFee",
  o.discount_amount  AS "discountAmount",
  (SELECT v.code FROM vouchers v WHERE v.id = o.voucher_id) AS "voucherCode",
  o.total,
  o.cancel_reason    AS "cancelReason",
  o.cancelled_at     AS "cancelledAt",
  o.payment_due_at   AS "paymentDueAt",
  o.paid_at          AS "paidAt",
  o.refunded_at      AS "refundedAt",
  o.created_at       AS "createdAt",
  COALESCE((SELECT json_agg(${ITEM_JSON} ORDER BY oi.id)
            FROM order_items oi WHERE oi.order_id = o.id), '[]'::json) AS items
`;

/** Chi tiết 1 đơn bất kỳ (hệ thống: IPN, job hết hạn) */
export async function findById(id: number, db: Queryable = pool): Promise<OrderDetail | null> {
  const { rows } = await db.query<OrderDetail>(
    `SELECT ${DETAIL_COLUMNS}, ${historyJson(false)} FROM orders o WHERE o.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Chi tiết 1 đơn của chính người dùng (của người khác → null). `forUpdate` khoá dòng đơn */
export async function findOwned(
  userId: number,
  id: number,
  db: Queryable = pool,
  forUpdate = false,
): Promise<OrderDetail | null> {
  if (forUpdate) {
    const { rowCount } = await db.query(
      'SELECT 1 FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [id, userId],
    );
    if (!rowCount) return null;
  }
  const { rows } = await db.query<OrderDetail>(
    `SELECT ${DETAIL_COLUMNS}, ${historyJson(false)} FROM orders o WHERE o.id = $1 AND o.user_id = $2`,
    [id, userId],
  );
  return rows[0] ?? null;
}

/** Đơn của người dùng (mới nhất trước), mỗi đơn kèm tối đa 2 sách đầu */
export async function listByUser(
  userId: number,
  status: OrderStatus | undefined,
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: OrderSummary[]; total: number }> {
  // `totalRows` (đếm cho phân trang) — không đặt tên `total` vì trùng tổng tiền của đơn
  const { rows } = await db.query<OrderSummary & { totalRows: number }>(
    `SELECT o.id, o.code, o.status,
       o.payment_method AS "paymentMethod",
       o.payment_status AS "paymentStatus",
       o.payment_due_at AS "paymentDueAt",
       o.total,
       o.created_at AS "createdAt",
       (SELECT COALESCE(sum(oi.quantity), 0)::int FROM order_items oi WHERE oi.order_id = o.id)
         AS "itemCount",
       COALESCE((SELECT json_agg(p.item ORDER BY p.id) FROM (
                   SELECT oi.id, ${ITEM_JSON} AS item FROM order_items oi
                   WHERE oi.order_id = o.id ORDER BY oi.id LIMIT 2) p), '[]'::json)
         AS "previewItems",
       GREATEST((SELECT count(*)::int FROM order_items oi WHERE oi.order_id = o.id) - 2, 0)
         AS "moreCount",
       count(*) OVER()::int AS "totalRows"
     FROM orders o
     WHERE o.user_id = $1 AND ($2::text IS NULL OR o.status = $2)
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $3 OFFSET $4`,
    [userId, status ?? null, page.limit, offsetOf(page)],
  );
  return {
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
    total: rows[0]?.totalRows ?? 0,
  };
}

/** Số đơn theo từng trạng thái (tab "Đơn hàng của tôi") */
export async function countByStatus(
  userId: number,
  db: Queryable = pool,
): Promise<Partial<Record<OrderStatus, number>>> {
  const { rows } = await db.query<{ status: OrderStatus; count: number }>(
    'SELECT status, count(*)::int AS count FROM orders WHERE user_id = $1 GROUP BY status',
    [userId],
  );
  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
}

export async function markCancelled(id: number, reason: string, db: Queryable) {
  await db.query(
    `UPDATE orders SET status = 'CANCELLED', cancel_reason = $2, cancelled_at = now() WHERE id = $1`,
    [id, reason],
  );
}

// ---------- Thanh toán (M07) ----------

/** Thông tin đơn cần cho thanh toán. `forUpdate` khoá dòng đơn */
export interface PayableOrder {
  id: number;
  userId: number;
  code: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  paymentDueAt: Date | null;
}

export async function findPayable(
  id: number,
  db: Queryable = pool,
  forUpdate = false,
): Promise<PayableOrder | null> {
  const { rows } = await db.query<PayableOrder>(
    `SELECT id, user_id AS "userId", code, status,
       payment_method AS "paymentMethod", payment_status AS "paymentStatus",
       total, payment_due_at AS "paymentDueAt"
     FROM orders WHERE id = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id],
  );
  return rows[0] ?? null;
}

export async function markPaid(id: number, paidAt: Date, db: Queryable) {
  await db.query(`UPDATE orders SET payment_status = 'PAID', paid_at = $2 WHERE id = $1`, [
    id,
    paidAt,
  ]);
}

export async function setPaymentStatus(id: number, status: PaymentStatus, db: Queryable) {
  await db.query('UPDATE orders SET payment_status = $2 WHERE id = $1', [id, status]);
}

/**
 * Khoá các đơn VNPay chưa thanh toán đã quá hạn + `graceMinutes` (giờ DB) — job tự huỷ.
 * SKIP LOCKED: bỏ qua đơn đang được IPN / khách xử lý, lượt sau quét lại.
 */
export async function lockOverdueUnpaid(
  graceMinutes: number,
  limit: number,
  db: Queryable,
): Promise<number[]> {
  const { rows } = await db.query<{ id: number }>(
    `SELECT id FROM orders
     WHERE status = 'PENDING' AND payment_method = 'VNPAY' AND payment_status <> 'PAID'
       AND payment_due_at < now() - make_interval(mins => $1::int)
     ORDER BY payment_due_at
     LIMIT $2
     FOR UPDATE SKIP LOCKED`,
    [graceMinutes, limit],
  );
  return rows.map((row) => row.id);
}

// ---------- Admin (M08) ----------

const ADMIN_SORTS: Record<AdminOrderListQuery['sort'], string> = {
  created_desc: 'o.created_at DESC, o.id DESC',
  created_asc: 'o.created_at ASC, o.id ASC',
  total_desc: 'o.total DESC, o.id DESC',
};

export interface AdminOrderFilters {
  status?: OrderStatus;
  needsRefund: boolean;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  from?: Date;
  to?: Date;
  userId?: number;
  /** Đã escape ký tự đặc biệt của LIKE */
  keyword?: string;
  sort: AdminOrderListQuery['sort'];
}

/** Danh sách đơn cho Admin — lọc, tìm (mã đơn, SĐT, tên, email), sắp xếp, phân trang */
export async function listForAdmin(
  filters: AdminOrderFilters,
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: AdminOrderRow[]; total: number }> {
  const { rows } = await db.query<AdminOrderRow & { totalRows: number }>(
    `SELECT o.id, o.code, o.status,
       o.payment_method  AS "paymentMethod",
       o.payment_status  AS "paymentStatus",
       o.total,
       o.created_at      AS "createdAt",
       o.recipient_name  AS "recipientName",
       o.recipient_phone AS "recipientPhone",
       (SELECT COALESCE(sum(oi.quantity), 0)::int FROM order_items oi WHERE oi.order_id = o.id)
         AS "itemCount",
       json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) AS customer,
       count(*) OVER()::int AS "totalRows"
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE ($1::text IS NULL OR o.status = $1)
       AND (NOT $2::boolean OR (o.status = 'CANCELLED' AND o.payment_status = 'PAID'))
       AND ($3::text IS NULL OR o.payment_method = $3)
       AND ($4::text IS NULL OR o.payment_status = $4)
       AND ($5::timestamptz IS NULL OR o.created_at >= $5)
       AND ($6::timestamptz IS NULL OR o.created_at < $6)
       AND ($7::int IS NULL OR o.user_id = $7)
       AND ($8::text IS NULL
            OR o.code ILIKE '%' || $8 || '%'
            OR o.recipient_phone LIKE $8 || '%'
            OR u.email ILIKE '%' || $8 || '%'
            OR lower(f_unaccent(o.recipient_name)) LIKE '%' || lower(f_unaccent($8)) || '%'
            OR lower(f_unaccent(u.full_name)) LIKE '%' || lower(f_unaccent($8)) || '%')
     ORDER BY ${ADMIN_SORTS[filters.sort]}
     LIMIT $9 OFFSET $10`,
    [
      filters.status ?? null,
      filters.needsRefund,
      filters.paymentMethod ?? null,
      filters.paymentStatus ?? null,
      filters.from ?? null,
      filters.to ?? null,
      filters.userId ?? null,
      filters.keyword ?? null,
      page.limit,
      offsetOf(page),
    ],
  );
  return {
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
    total: rows[0]?.totalRows ?? 0,
  };
}

/** Số đơn theo trạng thái + số đơn cần hoàn tiền (tab, badge menu Admin) */
export async function countForAdmin(
  db: Queryable = pool,
): Promise<Partial<Record<OrderStatus, number>> & { needsRefund: number }> {
  const { rows } = await db.query<{ status: OrderStatus; count: number; refund: number }>(
    `SELECT status, count(*)::int AS count,
       count(*) FILTER (WHERE status = 'CANCELLED' AND payment_status = 'PAID')::int AS refund
     FROM orders GROUP BY status`,
  );
  return {
    ...Object.fromEntries(rows.map((row) => [row.status, row.count])),
    needsRefund: rows.reduce((sum, row) => sum + row.refund, 0),
  };
}

/** Chi tiết đơn cho Admin (chưa gồm các lượt thanh toán) */
export async function findForAdmin(
  id: number,
  db: Queryable = pool,
): Promise<Omit<AdminOrderDetail, 'payments'> | null> {
  const { rows } = await db.query<Omit<AdminOrderDetail, 'payments'>>(
    `SELECT ${DETAIL_COLUMNS}, ${historyJson(true)},
       json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email,
                         'phone', u.phone, 'isActive', u.is_active) AS customer
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function setStatus(id: number, status: OrderStatus, db: Queryable) {
  await db.query('UPDATE orders SET status = $2 WHERE id = $1', [id, status]);
}

export async function markRefunded(id: number, db: Queryable) {
  await db.query(
    `UPDATE orders SET payment_status = 'REFUNDED', refunded_at = now() WHERE id = $1`,
    [id],
  );
}
