'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import * as paymentApi from '../api/payment.api';

export const paymentKeys = {
  methods: ['payments', 'methods'] as const,
  vnpayReturn: (query: string) => ['payments', 'vnpay-return', query] as const,
};

export function usePaymentMethods() {
  return useQuery({
    queryKey: paymentKeys.methods,
    queryFn: paymentApi.getPaymentMethods,
    staleTime: 5 * 60 * 1000,
  });
}

/** Tạo link VNPay rồi chuyển trình duyệt sang cổng thanh toán */
export function usePayWithVnpay() {
  return useMutation({
    mutationFn: paymentApi.createVnpayPayment,
    onSuccess: ({ paymentUrl }) => window.location.assign(paymentUrl),
  });
}

/** Đọc kết quả VNPay trả về — mỗi bộ tham số chỉ gửi server 1 lần */
export function useVnpayReturn(query: string) {
  return useQuery({
    queryKey: paymentKeys.vnpayReturn(query),
    queryFn: () => paymentApi.readVnpayReturn(query),
    enabled: query.includes('vnp_SecureHash='),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}
