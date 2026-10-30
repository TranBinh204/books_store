import type { Queryable } from '../db/pool';
import { AppError } from '../utils/AppError';

export async function lockForOrder(
  _code: string,
  _userId: number,
  _subtotal: number,
  _client: Queryable,
): Promise<{ voucherId: number; discountAmount: number }> {
  throw new AppError(404, 'VOUCHER_NOT_FOUND', 'Mã giảm giá không tồn tại');
}

export async function useForOrder(
  _input: { voucherId: number; userId: number; orderId: number },
  _client: Queryable,
): Promise<void> {
  // Sẽ lưu lịch sử dùng voucher khi triển khai M11
}

export async function releaseForOrder(_orderId: number, _client: Queryable): Promise<void> {
  // Sẽ hoàn lượt voucher khi huỷ đơn khi triển khai M11
}
