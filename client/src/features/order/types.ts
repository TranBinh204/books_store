// Đơn hàng (M06) — khớp server/src/types/order.types.ts

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'VNPAY';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  bookId: number;
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
  createdAt: string;
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
  cancelledAt: string | null;
  /** Hạn thanh toán đơn VNPay (COD = null) — M07 */
  paymentDueAt: string | null;
  paidAt: string | null;
  /** Admin xác nhận đã hoàn tiền — M08 */
  refundedAt: string | null;
  createdAt: string;
  items: OrderItem[];
  history: OrderStatusEvent[];
}

export interface OrderSummary {
  id: number;
  code: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDueAt: string | null;
  total: number;
  createdAt: string;
  itemCount: number;
  previewItems: OrderItem[];
  moreCount: number;
}

export interface CreateOrderPayload {
  addressId: number;
  paymentMethod: PaymentMethod;
  note: string | null;
  /** Mã giảm giá (M11) */
  voucherCode: string | null;
  /** Tạm tính − giảm giá client đang thấy */
  expectedTotal: number;
}
