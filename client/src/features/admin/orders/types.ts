import type {
  OrderDetail,
  OrderStatus,
  OrderStatusEvent,
  PaymentMethod,
  PaymentStatus,
} from '@/features/order';

// Admin xử lý đơn hàng (M08) — khớp server/src/types/order.types.ts

export type AdminOrderSort = 'created_desc' | 'created_asc' | 'total_desc';

export interface AdminOrderListParams {
  status?: OrderStatus;
  needsRefund?: boolean;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  /** yyyy-mm-dd (giờ Việt Nam) */
  from?: string;
  to?: string;
  q?: string;
  userId?: number;
  sort: AdminOrderSort;
  page: number;
  limit: number;
}

export interface AdminOrderRow {
  id: number;
  code: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: string;
  recipientName: string;
  recipientPhone: string;
  itemCount: number;
  customer: { id: number; fullName: string; email: string };
}

export type AdminOrderCounts = Partial<Record<OrderStatus, number>> & { needsRefund: number };

export interface PaymentRecord {
  id: number;
  method: PaymentMethod;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  txnRef: string | null;
  providerTxnNo: string | null;
  bankCode: string | null;
  responseCode: string | null;
  responseMessage: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminOrderStatusEvent extends OrderStatusEvent {
  changedBy: { id: number; fullName: string; role: 'CUSTOMER' | 'ADMIN' } | null;
}

export interface AdminOrderDetail extends Omit<OrderDetail, 'history'> {
  customer: {
    id: number;
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
  };
  history: AdminOrderStatusEvent[];
  payments: PaymentRecord[];
}

/** Trạng thái Admin bấm chuyển tới (bước kế tiếp) */
export type AdminNextStatus = 'CONFIRMED' | 'SHIPPING' | 'DELIVERED';
