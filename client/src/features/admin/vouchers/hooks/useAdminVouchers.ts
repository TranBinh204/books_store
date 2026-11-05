'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as voucherApi from '../api/admin-voucher.api';
import type { AdminVoucherParams, VoucherPayload } from '../types';

export const adminVouchersKey = ['admin', 'vouchers'] as const;

export function useAdminVouchers(params: AdminVoucherParams) {
  return useQuery({
    queryKey: [...adminVouchersKey, 'list', params],
    queryFn: () => voucherApi.listVouchers(params),
    placeholderData: keepPreviousData,
  });
}

export function useVoucherOrders(id: number, page: number, limit: number) {
  return useQuery({
    queryKey: [...adminVouchersKey, 'orders', id, page, limit],
    queryFn: () => voucherApi.listVoucherOrders(id, { page, limit }),
    placeholderData: keepPreviousData,
  });
}

/** Thêm (không có `id`) / sửa voucher */
export function useSaveVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: Partial<VoucherPayload> }) =>
      id === undefined
        ? voucherApi.createVoucher(payload as VoucherPayload)
        : voucherApi.updateVoucher(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminVouchersKey }),
  });
}

export function useDeleteVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voucherApi.deleteVoucher,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminVouchersKey }),
  });
}
