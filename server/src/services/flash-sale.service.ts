import type { Queryable } from '../db/pool';
import type { FlashSaleRow } from '../repositories/book.repository';

export interface FlashPricing {
  unitPrice: number;
  flashSaleItemId: number | null;
  limitExceeded: boolean;
  /** Số cuốn khách còn được mua giá sale */
  allowed: number;
}

export interface LockedFlashSaleItem {
  id: number;
  flashSaleId: number;
  bookId: number;
  salePrice: number;
  quantity: number;
  sold: number;
  perUserLimit: number;
  endAt: Date;
}

/**
 * Giá 1 dòng:
 * - không có flash sale / giá sale ≥ giá bán / suất còn lại < số lượng → giá thường
 * - khách đã mua hết lượt giá sale (`bought` ≥ giới hạn) → giá thường
 * - số lượng > số lượt còn lại → giá sale nhưng `limitExceeded` (phải giảm số lượng)
 */
export function priceLine(
  flash: Pick<FlashSaleRow, 'itemId' | 'salePrice' | 'quantity' | 'sold' | 'perUserLimit'> | null,
  price: number,
  quantity: number,
  bought: number,
): FlashPricing {
  const regular: FlashPricing = {
    unitPrice: price,
    flashSaleItemId: null,
    limitExceeded: false,
    allowed: 0,
  };
  if (!flash || flash.salePrice >= price || flash.quantity - flash.sold < quantity) return regular;
  const allowed = flash.perUserLimit - bought;
  if (allowed <= 0) return regular;
  return {
    unitPrice: flash.salePrice,
    flashSaleItemId: flash.itemId,
    limitExceeded: quantity > allowed,
    allowed,
  };
}

export async function countBoughtByUser(
  _userId: number,
  _flashSaleItemIds: number[],
  _db?: Queryable,
): Promise<Map<number, number>> {
  return new Map();
}

export async function lockForOrder(
  _flashRows: FlashSaleRow[],
  _client: Queryable,
): Promise<Map<number, LockedFlashSaleItem>> {
  return new Map();
}

export async function addSold(
  _flashSaleItemId: number,
  _quantity: number,
  _client: Queryable,
): Promise<void> {
  // Sẽ cập nhật số lượng bán khi triển khai M12
}

export async function releaseForOrder(_orderId: number, _client: Queryable): Promise<void> {
  // Sẽ hoàn lại số suất khi huỷ đơn khi triển khai M12
}
