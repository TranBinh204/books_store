import { pool, type Queryable } from '../db/pool';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';

/** Đếm số lượng đơn hàng theo từng trạng thái của người dùng (dùng cho tổng quan hồ sơ M04) */
export async function countByStatus(
  userId: number,
  db: Queryable = pool,
): Promise<Partial<Record<OrderStatus, number>>> {
  try {
    const { rows } = await db.query<{ status: OrderStatus; count: number }>(
      'SELECT status, count(*)::int AS count FROM orders WHERE user_id = $1 GROUP BY status',
      [userId],
    );
    return Object.fromEntries(rows.map((row) => [row.status, row.count])) as Partial<
      Record<OrderStatus, number>
    >;
  } catch {
    return {};
  }
}
