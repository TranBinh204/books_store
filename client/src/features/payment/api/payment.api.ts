import { http } from '@/lib/http';
import type { PaymentMethodOption, VnpayPaymentLink, VnpayReturnResult } from '../types';

export async function getPaymentMethods() {
  return (await http.get<PaymentMethodOption[]>('/payments/methods')).data;
}

/** Tạo 1 lượt thử thanh toán → link sang cổng VNPay */
export async function createVnpayPayment(orderId: number) {
  return (await http.post<VnpayPaymentLink>(`/me/orders/${orderId}/vnpay`)).data;
}

/** Gửi nguyên query VNPay trả về (`vnp_...`) cho server kiểm tra chữ ký */
export async function readVnpayReturn(query: string) {
  return (await http.get<VnpayReturnResult>(`/payments/vnpay/return?${query}`)).data;
}
