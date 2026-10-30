import type { OrderStatus, PAYMENT_STATUSES, PaymentMethod } from '../schemas/order.schema';

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface OrderItem {
  bookId: number;
  /** Chụp lại lúc đặt */
  title: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /** Mua giá Flash Sale (M12) */
  isFlashSale: boolean;
}

export interface OrderStatusEvent {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdAt: Date;
}

export interface OrderDetail {
  id: number;
  code: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  note: string | null;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  /** Mã giảm giá đã dùng (M11) */
  voucherCode: string | null;
  total: number;
  cancelReason: string | null;
  cancelledAt: Date | null;
  /** Hạn thanh toán đơn VNPay (COD = null) — M07 */
  paymentDueAt: Date | null;
  paidAt: Date | null;
  /** Admin xác nhận đã hoàn tiền — M08 */
  refundedAt: Date | null;
  createdAt: Date;
  items: OrderItem[];
  history: OrderStatusEvent[];
}

/** 1 thẻ đơn trong "Đơn hàng của tôi" */
export interface OrderSummary {
  id: number;
  code: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDueAt: Date | null;
  total: number;
  createdAt: Date;
  /** Tổng số cuốn */
  itemCount: number;
  /** Tối đa 2 sách đầu để xem nhanh */
  previewItems: OrderItem[];
  /** Số đầu sách còn lại ngoài previewItems */
  moreCount: number;
}

// ---------- Admin (M08) ----------

/** 1 dòng trong danh sách đơn của Admin */
export interface AdminOrderRow {
  id: number;
  code: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  createdAt: Date;
  recipientName: string;
  recipientPhone: string;
  /** Tổng số cuốn */
  itemCount: number;
  customer: { id: number; fullName: string; email: string };
}

/** Lịch sử trạng thái kèm người thay đổi (null = hệ thống) */
export interface AdminOrderStatusEvent extends OrderStatusEvent {
  changedBy: { id: number; fullName: string; role: 'CUSTOMER' | 'ADMIN' } | null;
}

/** 1 lượt thử thanh toán (bảng payments) */
export interface PaymentRecord {
  id: number;
  method: PaymentMethod;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  txnRef: string | null;
  providerTxnNo: string | null;
  bankCode: string | null;
  responseCode: string | null;
  /** Câu giải thích mã phản hồi VNPay (null với COD / chưa có kết quả) */
  responseMessage: string | null;
  paidAt: Date | null;
  createdAt: Date;
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
