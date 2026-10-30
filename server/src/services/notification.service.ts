import type { Queryable } from '../db/pool';

export async function notifyOrder(
  _event: string,
  _orderId: number,
  _client: Queryable,
  _options: Record<string, unknown> = {},
): Promise<void> {
  // Sẽ gửi thông báo chuông (F18 - M13) khi triển khai Module 13
}
