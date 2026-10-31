import type { OrderStatus } from '@/features/order';
import type { Address } from '@/features/profile';

// Admin quản lý khách hàng (M08) — khớp server/src/types/customer.types.ts

export type CustomerSort = 'newest' | 'spent' | 'orders';

export interface CustomerListParams {
  q?: string;
  status?: 'active' | 'locked';
  sort: CustomerSort;
  page: number;
  limit: number;
}

export interface CustomerRow {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  /** Tổng tiền các đơn Đã giao */
  totalSpent: number;
}

export interface CustomerDetail extends CustomerRow {
  birthday: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  lockedAt: string | null;
  lockReason: string | null;
  orderCounts: Partial<Record<OrderStatus, number>>;
  lastOrderAt: string | null;
  addresses: Address[];
}
