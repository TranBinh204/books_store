import type { AdminTagTone } from '@/components/ui/AdminTag';

// Admin – Flash Sale (M12) — khớp server/src/types/flash-sale.types.ts

export type FlashSaleStatus = 'ACTIVE' | 'UPCOMING' | 'ENDED' | 'DISABLED';

export const FLASH_SALE_STATUS_TAG: Record<FlashSaleStatus, { label: string; tone: AdminTagTone }> =
  {
    ACTIVE: { label: 'Đang diễn ra', tone: 'ok' },
    UPCOMING: { label: 'Sắp diễn ra', tone: 'info' },
    ENDED: { label: 'Đã kết thúc', tone: 'muted' },
    DISABLED: { label: 'Tắt', tone: 'bad' },
  };

export interface AdminFlashSale {
  id: number;
  name: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  status: FlashSaleStatus;
  itemCount: number;
  totalQuantity: number;
  totalSold: number;
  /** Doanh thu giá sale — đơn chưa huỷ */
  revenue: number;
  /** Số đơn đã mua giá sale (gồm đơn đã huỷ) — > 0 thì không xoá được */
  orderCount: number;
  createdAt: string;
  updatedAt: string;
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
  /** > 0 thì khoá giá sale / giới hạn, không xoá được */
  orderCount: number;
}

export interface AdminFlashSaleDetail extends AdminFlashSale {
  items: AdminFlashSaleItem[];
}

export interface AdminFlashSaleParams {
  status?: FlashSaleStatus;
  page: number;
  limit: number;
}

export interface FlashSalePayload {
  name: string;
  startAt: string;
  endAt: string;
  isActive: boolean;
  items: { bookId: number; salePrice: number; quantity: number; perUserLimit: number }[];
}
