/**
 * Vấn đề của 1 dòng giỏ (dòng có vấn đề không tính vào tạm tính, khoá thanh toán):
 * UNAVAILABLE ngừng bán / danh mục ẩn · OUT_OF_STOCK hết hàng · EXCEEDS_STOCK số lượng > tồn ·
 * FLASH_SALE_LIMIT số lượng > số cuốn còn được mua giá Flash Sale (M12 quy tắc 4)
 */
export type CartIssue = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'EXCEEDS_STOCK' | 'FLASH_SALE_LIMIT';

/** Dòng đang được giá Flash Sale (M12) */
export interface CartFlashSale {
  perUserLimit: number;
  /** Số cuốn khách còn được mua giá sale (= giới hạn − đã mua ở đơn chưa huỷ) */
  allowed: number;
  endAt: Date;
}

export interface CartItem {
  bookId: number;
  title: string;
  coverUrl: string | null;
  /** Giá hiệu lực: giá Flash Sale nếu dòng được áp (M12), ngược lại giá bán */
  price: number;
  originalPrice: number;
  discountPercent: number;
  quantity: number;
  /** Số lượng chọn được tối đa = min(tồn kho, 99); 0 khi ngừng bán / hết hàng */
  maxQuantity: number;
  lineTotal: number;
  issue: CartIssue | null;
  flashSale: CartFlashSale | null;
}

export interface Cart {
  items: CartItem[];
  /** Tổng số lượng mọi dòng (số trên icon giỏ hàng) */
  totalQuantity: number;
  /** Tạm tính — chỉ gồm dòng không có vấn đề */
  subtotal: number;
  hasIssues: boolean;
}

/** Thêm vào giỏ bị giảm số lượng vì vượt tồn kho / 99 */
export interface CartAdjustment {
  bookId: number;
  requested: number;
  quantity: number;
}
