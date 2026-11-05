import type { OrderStatus } from '../schemas/order.schema';
import type { DiscountType, VoucherStatus } from '../schemas/voucher.schema';

/** Voucher đầy đủ (Admin) */
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

/** 1 dòng danh sách Admin */
export interface AdminVoucher extends Voucher {
  status: VoucherStatus;
  /** Số đơn đã dùng (gồm đơn đã huỷ) — > 0 thì khoá sửa một số trường & không xoá được */
  orderCount: number;
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

/** Kết quả kiểm tra mã với giỏ hàng */
export interface VoucherCheckResult extends Pick<
  Voucher,
  'code' | 'description' | 'discountType' | 'discountValue' | 'maxDiscount' | 'minOrderValue'
> {
  subtotal: number;
  discountAmount: number;
  total: number;
}

/** 1 đơn đã dùng voucher (Admin → Lượt dùng) */
export interface VoucherOrderUsage {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  discountAmount: number;
  total: number;
  createdAt: Date;
  customer: { id: number; fullName: string; email: string };
}
