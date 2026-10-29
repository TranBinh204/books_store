export type DiscountType = 'PERCENT' | 'FIXED';
export type VoucherStatus = 'UPCOMING' | 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'DISABLED';

export interface Voucher {
  id: number;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  startAt: Date;
  endAt: Date;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number;
  isPublic: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Thẻ voucher trang chủ */
export type PublicVoucher = Pick<
  Voucher,
  | 'code'
  | 'description'
  | 'discountType'
  | 'discountValue'
  | 'maxDiscount'
  | 'minOrderValue'
  | 'endAt'
>;
