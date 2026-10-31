import type { OrderStatus } from '../schemas/order.schema';
import type { Address } from './address.types';
import type { Gender } from './user.types';

// Admin quản lý khách hàng (M08)

/** 1 dòng danh sách khách hàng */
export interface CustomerRow {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  orderCount: number;
  /** Tổng tiền các đơn Đã giao */
  totalSpent: number;
}

export interface CustomerDetail extends CustomerRow {
  birthday: string | null;
  gender: Gender | null;
  lockedAt: Date | null;
  /** Chỉ Admin thấy */
  lockReason: string | null;
  orderCounts: Partial<Record<OrderStatus, number>>;
  lastOrderAt: Date | null;
  addresses: Address[];
}
