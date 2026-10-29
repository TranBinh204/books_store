// Mã giảm giá (M11) — khớp server/src/types/voucher.types.ts

export type DiscountType = 'PERCENT' | 'FIXED';

/** Thẻ voucher trang chủ */
export interface PublicVoucher {
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  endAt: string;
}

/** Kết quả kiểm tra mã với giỏ hàng */
export interface VoucherCheckResult {
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  subtotal: number;
  discountAmount: number;
  total: number;
}
