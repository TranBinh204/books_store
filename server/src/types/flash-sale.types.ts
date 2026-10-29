import type { PublicBookListItem } from './catalog.types';

// Flash Sale (M12)

/** Giá flash sale đang chạy của 1 sách — thẻ sách, chi tiết, khối trang chủ (mục 5.2) */
export interface BookFlashSale {
  salePrice: number;
  /** −% so với giá bìa (Q6) */
  discountPercent: number;
  /** Tổng suất */
  quantity: number;
  /** Đã bán (đơn chưa huỷ) */
  sold: number;
  perUserLimit: number;
  endAt: Date;
}

/** Thẻ sách trong khối / trang Flash Sale */
export interface FlashSaleBook extends PublicBookListItem {
  flashSale: BookFlashSale;
}

/** GET /api/flash-sales/current */
export interface CurrentFlashSale {
  id: number;
  name: string;
  startAt: Date;
  endAt: Date;
  items: FlashSaleBook[];
}

/** GET /api/flash-sales/upcoming — chỉ thông tin đợt, không lộ giá trước giờ */
export interface UpcomingFlashSale {
  id: number;
  name: string;
  startAt: Date;
  endAt: Date;
  itemCount: number;
}
