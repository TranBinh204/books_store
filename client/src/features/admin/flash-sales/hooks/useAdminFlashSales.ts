'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as flashSaleApi from '../api/admin-flash-sale.api';
import type { AdminFlashSaleParams, FlashSalePayload } from '../types';

export const adminFlashSalesKey = ['admin', 'flash-sales'] as const;

export function useAdminFlashSales(params: AdminFlashSaleParams) {
  return useQuery({
    queryKey: [...adminFlashSalesKey, 'list', params],
    queryFn: () => flashSaleApi.listFlashSales(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminFlashSale(id: number) {
  return useQuery({
    queryKey: [...adminFlashSalesKey, 'detail', id],
    queryFn: () => flashSaleApi.getFlashSale(id),
  });
}

/** Thêm (không có `id`) / sửa chương trình */
export function useSaveFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: FlashSalePayload }) =>
      id === undefined
        ? flashSaleApi.createFlashSale(payload)
        : flashSaleApi.updateFlashSale(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminFlashSalesKey }),
  });
}

export function useStopFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: flashSaleApi.stopFlashSale,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminFlashSalesKey }),
  });
}

export function useDeleteFlashSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: flashSaleApi.deleteFlashSale,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminFlashSalesKey }),
  });
}
