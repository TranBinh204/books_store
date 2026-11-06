import type { FlashSaleStatus } from '../schemas/flash-sale.schema';
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

// ---------- Admin ----------

export interface AdminFlashSale {
  id: number;
  name: string;
  startAt: Date;
  endAt: Date;
  isActive: boolean;
  status: FlashSaleStatus;
  itemCount: number;
  totalQuantity: number;
  totalSold: number;
  /** Doanh thu giá sale — đơn chưa huỷ */
  revenue: number;
  /** Số đơn đã mua giá sale (gồm đơn đã huỷ) — > 0 thì không xoá được */
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminFlashSaleItem {
  id: number;
  book: {
    id: number;
    title: string;
    coverUrl: string | null;
    originalPrice: number;
    price: number;
    stock: number;
    isActive: boolean;
  };
  salePrice: number;
  quantity: number;
  sold: number;
  perUserLimit: number;
  /** Số đơn đã mua sách này giá sale (gồm đơn đã huỷ) — > 0 thì khoá giá / giới hạn, không xoá */
  orderCount: number;
}

export interface AdminFlashSaleDetail extends AdminFlashSale {
  items: AdminFlashSaleItem[];
}
