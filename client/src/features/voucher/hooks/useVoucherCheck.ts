'use client';

import { useQuery } from '@tanstack/react-query';
import * as voucherApi from '../api/voucher.api';

export const voucherCheckKey = ['me', 'voucher-check'] as const;

/**
 * Kiểm tra mã đã nhập với giỏ hàng. Khoá gồm cả tạm tính → giỏ đổi là tự kiểm tra lại
 * (M11 mục 4.2). `code = null` → không chạy.
 */
export function useVoucherCheck(code: string | null, subtotal: number) {
  return useQuery({
    queryKey: [...voucherCheckKey, code, subtotal],
    queryFn: () => voucherApi.checkVoucher(code!),
    enabled: code !== null,
    retry: false,
  });
}
