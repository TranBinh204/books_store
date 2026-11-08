import { pool, type Queryable } from '../db/pool';
import type { OrderStatus, PaymentMethod } from '../schemas/order.schema';
import type { PaymentStatus } from '../types/order.types';

// Dashboard & báo cáo (M14) — tổng hợp trực tiếp bằng GROUP BY, không có bảng thống kê riêng (Q5)

/** Đơn được tính doanh thu (quy tắc 1): chưa huỷ và (COD hoặc VNPay đã thanh toán) */
const COUNTED = `(o.status <> 'CANCELLED' AND (o.payment_method = 'COD' OR o.payment_status = 'PAID'))`;
/** Ngày đặt theo giờ Việt Nam */
const LOCAL_DAY = `(o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date`;

/** Khoảng truy vấn: [from, to) — mốc UTC đã quy đổi từ ngày giờ VN */
export interface TimeRange {
  from: Date;
  to: Date;
}

export interface Metrics {
  revenue: number;
  orders: number;
  cancelledOrders: number;
  voucherDiscount: number;
  newCustomers: number;
}

export async function metrics(range: TimeRange, db: Queryable = pool): Promise<Metrics> {
  const { rows } = await db.query<Metrics>(
    `SELECT
       COALESCE(sum(o.total) FILTER (WHERE ${COUNTED}), 0)::bigint AS revenue,
       count(*) FILTER (WHERE ${COUNTED})::int AS orders,
       count(*) FILTER (WHERE o.status = 'CANCELLED')::int AS "cancelledOrders",
       COALESCE(sum(o.discount_amount) FILTER (WHERE ${COUNTED}), 0)::bigint AS "voucherDiscount",
       (SELECT count(*)::int FROM users u
        WHERE u.role = 'CUSTOMER' AND u.created_at >= $1 AND u.created_at < $2) AS "newCustomers"
     FROM orders o
     WHERE o.created_at >= $1 AND o.created_at < $2`,
    [range.from, range.to],
  );
  return rows[0];
}

export interface ChartPoint {
  /** "2026-10-01" (ngày) · "2026-10" (tháng) */
  date: string;
  revenue: number;
  orders: number;
  voucherDiscount: number;
  newCustomers: number;
}

/**
 * Doanh thu theo ngày / tháng trong [fromDay, toDay] (yyyy-mm-dd giờ VN) — ngày / tháng
 * không có đơn vẫn có dòng (generate_series), giá trị 0 (quy tắc 6)
 */
export async function chart(
  fromDay: string,
  toDay: string,
  range: TimeRange,
  granularity: 'day' | 'month',
  db: Queryable = pool,
): Promise<ChartPoint[]> {
  const bucket = granularity === 'day' ? LOCAL_DAY : `date_trunc('month', ${LOCAL_DAY})::date`;
  const series =
    granularity === 'day'
      ? `generate_series($1::date, $2::date, interval '1 day')`
      : `generate_series(date_trunc('month', $1::date), $2::date, interval '1 month')`;
  const userBucket = bucket.replaceAll('o.created_at', 'u.created_at');
  const label = granularity === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
  const { rows } = await db.query<ChartPoint>(
    `WITH buckets AS (SELECT d::date AS bucket FROM ${series} d),
     agg AS (
       SELECT ${bucket} AS bucket, sum(o.total)::bigint AS revenue, count(*)::int AS orders,
         sum(o.discount_amount)::bigint AS discount
       FROM orders o
       WHERE ${COUNTED} AND o.created_at >= $3 AND o.created_at < $4
       GROUP BY 1
     ),
     signups AS (
       SELECT ${userBucket} AS bucket, count(*)::int AS customers
       FROM users u
       WHERE u.role = 'CUSTOMER' AND u.created_at >= $3 AND u.created_at < $4
       GROUP BY 1
     )
     SELECT to_char(b.bucket, '${label}') AS date,
       COALESCE(a.revenue, 0)::bigint AS revenue,
       COALESCE(a.orders, 0)::int AS orders,
       COALESCE(a.discount, 0)::bigint AS "voucherDiscount",
       COALESCE(s.customers, 0)::int AS "newCustomers"
     FROM buckets b
     LEFT JOIN agg a ON a.bucket = b.bucket
     LEFT JOIN signups s ON s.bucket = b.bucket
     ORDER BY b.bucket`,
    [fromDay, toDay, range.from, range.to],
  );
  return rows;
}

export interface TopBook {
  bookId: number;
  /** Tên / ảnh chụp trong đơn gần nhất (sách đã ẩn vẫn có) */
  title: string;
  image: string | null;
  quantity: number;
  revenue: number;
}

/** Sách bán nhiều cuốn nhất trong đơn được tính (quy tắc 7) — `limit` null = tất cả */
export async function topBooks(
  range: TimeRange,
  limit: number | null,
  db: Queryable = pool,
): Promise<TopBook[]> {
  const { rows } = await db.query<TopBook>(
    `SELECT oi.book_id AS "bookId",
       (array_agg(oi.book_title ORDER BY o.created_at DESC))[1] AS title,
       (array_agg(oi.book_image ORDER BY o.created_at DESC))[1] AS image,
       sum(oi.quantity)::int AS quantity,
       sum(oi.unit_price * oi.quantity)::bigint AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE ${COUNTED} AND o.created_at >= $1 AND o.created_at < $2
     GROUP BY oi.book_id
     ORDER BY quantity DESC, revenue DESC, oi.book_id
     LIMIT $3`,
    [range.from, range.to, limit],
  );
  return rows;
}

// ---------- Việc cần làm (quy tắc 8, 9) ----------

export interface OrderTasks {
  toConfirm: number;
  toShip: number;
  shipping: number;
  needsRefund: number;
}

export async function orderTasks(db: Queryable = pool): Promise<OrderTasks> {
  const { rows } = await db.query<OrderTasks>(
    `SELECT
       count(*) FILTER (WHERE o.status = 'PENDING'
                          AND (o.payment_method = 'COD' OR o.payment_status = 'PAID'))::int AS "toConfirm",
       count(*) FILTER (WHERE o.status = 'CONFIRMED')::int AS "toShip",
       count(*) FILTER (WHERE o.status = 'SHIPPING')::int AS shipping,
       count(*) FILTER (WHERE o.status = 'CANCELLED' AND o.payment_status = 'PAID')::int
         AS "needsRefund"
     FROM orders o
     WHERE o.status IN ('PENDING', 'CONFIRMED', 'SHIPPING')
        OR (o.status = 'CANCELLED' AND o.payment_status = 'PAID')`,
  );
  return rows[0];
}

export interface WaitingOrder {
  id: number;
  code: string;
  customerName: string;
  total: number;
  createdAt: Date;
}

/** Đơn chờ xác nhận lâu nhất */
export async function oldestToConfirm(
  limit: number,
  db: Queryable = pool,
): Promise<WaitingOrder[]> {
  const { rows } = await db.query<WaitingOrder>(
    `SELECT o.id, o.code, u.full_name AS "customerName", o.total, o.created_at AS "createdAt"
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.status = 'PENDING' AND (o.payment_method = 'COD' OR o.payment_status = 'PAID')
     ORDER BY o.created_at, o.id
     LIMIT $1`,
    [limit],
  );
  return rows;
}

export interface LowStockBook {
  id: number;
  title: string;
  coverUrl: string | null;
  stock: number;
}

/** Sách đang bán có tồn ≤ ngưỡng, tồn ít nhất trước + tổng số */
export async function lowStock(
  threshold: number,
  limit: number,
  db: Queryable = pool,
): Promise<{ total: number; items: LowStockBook[] }> {
  const { rows } = await db.query<LowStockBook & { totalRows: number }>(
    `SELECT b.id, b.title, b.stock,
       (SELECT bi.url FROM book_images bi WHERE bi.book_id = b.id ORDER BY bi.sort_order LIMIT 1)
         AS "coverUrl",
       count(*) OVER()::int AS "totalRows"
     FROM books b
     WHERE b.is_active AND b.stock <= $1
     ORDER BY b.stock, b.id
     LIMIT $2`,
    [threshold, limit],
  );
  return {
    total: rows[0]?.totalRows ?? 0,
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
  };
}

// ---------- Xuất báo cáo ----------

export interface ExportOrder {
  code: string;
  createdAt: Date;
  customerName: string;
  email: string;
  recipientPhone: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  voucherCode: string | null;
  total: number;
  counted: boolean;
}

/** Mọi đơn trong khoảng (mọi trạng thái), cũ trước — tối đa `limit` dòng (quy tắc 10) */
export async function ordersForExport(
  range: TimeRange,
  limit: number,
  db: Queryable = pool,
): Promise<ExportOrder[]> {
  const { rows } = await db.query<ExportOrder>(
    `SELECT o.code, o.created_at AS "createdAt", u.full_name AS "customerName", u.email,
       o.recipient_phone AS "recipientPhone", o.status,
       o.payment_method AS "paymentMethod", o.payment_status AS "paymentStatus",
       (SELECT COALESCE(sum(oi.quantity), 0)::int FROM order_items oi WHERE oi.order_id = o.id)
         AS "itemCount",
       o.subtotal, o.discount_amount AS "discountAmount",
       (SELECT v.code FROM vouchers v WHERE v.id = o.voucher_id) AS "voucherCode",
       o.total, ${COUNTED} AS counted
     FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.created_at >= $1 AND o.created_at < $2
     ORDER BY o.created_at, o.id
     LIMIT $3`,
    [range.from, range.to, limit],
  );
  return rows;
}
