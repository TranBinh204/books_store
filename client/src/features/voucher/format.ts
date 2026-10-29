import { formatPrice } from '@/lib/format';
import type { DiscountType } from './types';

/** Số tiền gọn kiểu azvietnam: 50000 → "50K", 1500000 → "1.500K"; lẻ → "12.500₫" */
export function shortPrice(value: number) {
  return value % 1000 === 0
    ? `${new Intl.NumberFormat('vi-VN').format(value / 1000)}K`
    : formatPrice(value);
}

interface DiscountInfo {
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
}

/** "Giảm 10%" / "Giảm 50K" */
export function voucherTitle(voucher: DiscountInfo) {
  return voucher.discountType === 'PERCENT'
    ? `Giảm ${voucher.discountValue}%`
    : `Giảm ${shortPrice(voucher.discountValue)}`;
}

/** "Đơn hàng từ 200K · Tối đa 30K" / "Mọi đơn hàng" */
export function voucherCondition(voucher: DiscountInfo) {
  const parts = [
    voucher.minOrderValue > 0 ? `Đơn hàng từ ${shortPrice(voucher.minOrderValue)}` : 'Mọi đơn hàng',
  ];
  if (voucher.discountType === 'PERCENT' && voucher.maxDiscount !== null) {
    parts.push(`Tối đa ${shortPrice(voucher.maxDiscount)}`);
  }
  return parts.join(' · ');
}

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** "2026-12-31T16:59:59Z" → "31/12/2026" (giờ Việt Nam) */
export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}
