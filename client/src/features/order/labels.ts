import type { OrderStatus, PaymentMethod, PaymentStatus } from './types';

// Nhãn hiển thị — dùng chung trang khách hàng (M06) và Admin (M08)

export const ORDER_STATUS_LABELS: Record<OrderStatus, { label: string }> = {
  PENDING: { label: 'Chờ xác nhận' },
  CONFIRMED: { label: 'Đã xác nhận' },
  SHIPPING: { label: 'Đang giao' },
  DELIVERED: { label: 'Đã giao' },
  CANCELLED: { label: 'Đã huỷ' },
};

/** Thứ tự các tab "Đơn hàng của tôi" */
export const ORDER_STATUS_TABS: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi giao hàng (COD)',
  VNPAY: 'VNPay',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

/** Đơn VNPay đang chờ khách thanh toán (M07) */
export function isAwaitingPayment(order: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}) {
  return (
    order.status === 'PENDING' && order.paymentMethod === 'VNPAY' && order.paymentStatus !== 'PAID'
  );
}

/** KH tự huỷ được: còn chờ xác nhận và chưa thanh toán (M07 quy tắc 11) */
export function canCustomerCancel(order: { status: OrderStatus; paymentStatus: PaymentStatus }) {
  return order.status === 'PENDING' && order.paymentStatus !== 'PAID';
}

/** Lý do huỷ đơn (M06 quy tắc 11) — "Khác" phải tự nhập */
export const CANCEL_REASONS = [
  'Tôi muốn đổi ý, không mua nữa',
  'Tôi muốn đổi địa chỉ / sản phẩm trong đơn',
  'Tôi đặt nhầm',
  'Tôi tìm được giá tốt hơn',
];
