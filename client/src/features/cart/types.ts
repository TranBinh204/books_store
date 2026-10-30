// Giỏ hàng (M05) — khớp server/src/types/cart.types.ts

/**
 * UNAVAILABLE ngừng bán · OUT_OF_STOCK hết hàng · EXCEEDS_STOCK số lượng > tồn kho ·
 * FLASH_SALE_LIMIT số lượng > số cuốn còn được mua giá Flash Sale (M12)
 */
export type CartIssue = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'EXCEEDS_STOCK' | 'FLASH_SALE_LIMIT';

/** Dòng đang được giá Flash Sale (M12) */
export interface CartFlashSale {
  perUserLimit: number;
  /** Số cuốn khách còn được mua giá sale */
  allowed: number;
  endAt: string;
}

export interface CartItem {
  bookId: number;
  title: string;
  coverUrl: string | null;
  /** Giá hiệu lực (giá Flash Sale nếu dòng được áp) */
  price: number;
  originalPrice: number;
  discountPercent: number;
  quantity: number;
  maxQuantity: number;
  lineTotal: number;
  issue: CartIssue | null;
  flashSale: CartFlashSale | null;
}

export interface Cart {
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  hasIssues: boolean;
}

export interface CartLine {
  bookId: number;
  quantity: number;
}

export interface CartAdjustment {
  bookId: number;
  requested: number;
  quantity: number;
}

export const EMPTY_CART: Cart = { items: [], totalQuantity: 0, subtotal: 0, hasIssues: false };
