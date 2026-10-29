import type { BookCardItem } from '@/features/catalog/types/catalog.types';

// Flash Sale (M12) — khớp server/src/types/flash-sale.types.ts

/** Giá flash sale đang chạy của 1 sách */
export interface BookFlashSale {
  salePrice: number;
  /** −% so với giá bìa */
  discountPercent: number;
  quantity: number;
  sold: number;
  perUserLimit: number;
  endAt: string;
}

export interface FlashSaleBook extends BookCardItem {
  flashSale: BookFlashSale;
}

export interface CurrentFlashSale {
  id: number;
  name: string;
  startAt: string;
  endAt: string;
  items: FlashSaleBook[];
}

/** Còn suất giá sale */
export const isFlashSaleAvailable = (
  flashSale: BookFlashSale | null | undefined,
): flashSale is BookFlashSale => !!flashSale && flashSale.sold < flashSale.quantity;

/** Đợt sắp diễn ra sớm nhất — chỉ thông tin đợt, chưa lộ sách / giá (GET /flash-sales/upcoming) */
export interface UpcomingFlashSale {
  id: number;
  name: string;
  startAt: string;
  endAt: string;
  itemCount: number;
}
