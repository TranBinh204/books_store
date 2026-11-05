import type { AdminTagTone } from '@/components/ui/AdminTag';
import type { OrderStatus } from '@/features/order';
import type { DiscountType } from '@/features/voucher/types';

// Admin – Voucher (M11) — khớp server/src/types/voucher.types.ts

export type VoucherStatus = 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'USED_UP' | 'DISABLED';

export interface AdminVoucher {
  id: number;
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  startAt: string;
  endAt: string;
  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  status: VoucherStatus;
  /** Số đơn đã dùng (gồm đơn đã huỷ) — > 0 thì khoá một số trường & không xoá được */
  orderCount: number;
}

export interface AdminVoucherParams {
  q?: string;
  status?: VoucherStatus;
  visibility?: 'public' | 'private';
  page: number;
  limit: number;
}

export interface VoucherPayload {
  code: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  startAt: string;
  endAt: string;
  usageLimit: number | null;
  perUserLimit: number;
  isPublic: boolean;
  isActive: boolean;
}

export interface VoucherOrderUsage {
  orderId: number;
  orderCode: string;
  status: OrderStatus;
  discountAmount: number;
  total: number;
  createdAt: string;
  customer: { id: number; fullName: string; email: string };
}

export const VOUCHER_STATUS_TAG: Record<VoucherStatus, { label: string; tone: AdminTagTone }> = {
  ACTIVE: { label: 'Đang chạy', tone: 'ok' },
  UPCOMING: { label: 'Chưa bắt đầu', tone: 'info' },
  EXPIRED: { label: 'Hết hạn', tone: 'muted' },
  USED_UP: { label: 'Hết lượt', tone: 'warn' },
  DISABLED: { label: 'Tắt', tone: 'bad' },
};
