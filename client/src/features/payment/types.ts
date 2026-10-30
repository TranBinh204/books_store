// Thanh toán (M07) — khớp server/src/types/payment.types.ts

export type PaymentMethodCode = 'COD' | 'VNPAY';

/** GET /api/payments/methods — VNPay tắt khi server chưa cấu hình */
export interface PaymentMethodOption {
  code: PaymentMethodCode;
  available: boolean;
}

export interface VnpayPaymentLink {
  paymentUrl: string;
  expiresAt: string;
}

/** Kết quả VNPay trả về (trang /thanh-toan/ket-qua) — chỉ để hiển thị */
export interface VnpayReturnResult {
  orderId: number;
  orderCode: string;
  success: boolean;
  responseCode: string | null;
  message: string;
  amount: number;
  transactionNo: string | null;
  paymentDueAt: string | null;
}
