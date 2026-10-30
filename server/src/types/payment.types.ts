import type { PaymentMethod } from '../schemas/order.schema';

// Thanh toán (M07) — docs/03-modules/07-payment.md

export type PaymentAttemptStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

/** 1 lượt thử thanh toán (bảng payments) */
export interface PaymentAttempt {
  id: number;
  orderId: number;
  method: PaymentMethod;
  amount: number;
  status: PaymentAttemptStatus;
  txnRef: string | null;
  expiresAt: Date | null;
}

/** Kết quả trả cho trang /thanh-toan/ket-qua (chỉ hiển thị) */
export interface VnpayReturnResult {
  orderId: number;
  orderCode: string;
  success: boolean;
  responseCode: string | null;
  message: string;
  amount: number;
  transactionNo: string | null;
  /** Hạn thanh toán của đơn — thất bại thì còn thử lại được tới lúc này */
  paymentDueAt: Date | null;
}
