import type { AdminTagTone } from '@/components/ui/AdminTag';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/features/order';
import type { AdminNextStatus } from './types';

// Nhãn riêng trang Admin đơn hàng (M08). Nhãn trạng thái đơn dùng chung từ features/order

export const PAYMENT_METHOD_SHORT: Record<PaymentMethod, string> = { COD: 'COD', VNPAY: 'VNPay' };

export const PAYMENT_STATUS_TAG: Record<PaymentStatus, { label: string; tone: AdminTagTone }> = {
  UNPAID: { label: 'Chưa thanh toán', tone: 'muted' },
  PAID: { label: 'Đã thanh toán', tone: 'ok' },
  FAILED: { label: 'Thất bại', tone: 'bad' },
  REFUNDED: { label: 'Đã hoàn tiền', tone: 'info' },
};

/** Bước kế tiếp & chữ trên nút (quy tắc 2) */
export const NEXT_ACTION: Partial<Record<OrderStatus, { status: AdminNextStatus; label: string }>> =
  {
    PENDING: { status: 'CONFIRMED', label: 'Xác nhận đơn' },
    CONFIRMED: { status: 'SHIPPING', label: 'Bắt đầu giao' },
    SHIPPING: { status: 'DELIVERED', label: 'Đã giao' },
  };

/** Admin huỷ được (Q1: gồm cả đang giao) */
export const ADMIN_CANCELLABLE: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPING'];

/** Lý do Admin huỷ (quy tắc 5) — "Khác" tự nhập */
export const ADMIN_CANCEL_REASONS = [
  'Hết hàng / không đủ hàng',
  'Khách yêu cầu huỷ',
  'Không liên hệ được khách',
  'Giao hàng thất bại',
];

export const needsRefund = (order: { status: OrderStatus; paymentStatus: PaymentStatus }) =>
  order.status === 'CANCELLED' && order.paymentStatus === 'PAID';
