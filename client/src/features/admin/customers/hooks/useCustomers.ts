'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as customerApi from '../api/customer.api';
import type { CustomerListParams } from '../types';

export const customersKey = ['admin', 'customers'] as const;

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: [...customersKey, 'list', params],
    queryFn: () => customerApi.listCustomers(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: [...customersKey, 'detail', id],
    queryFn: () => customerApi.getCustomer(id),
  });
}

/** Khoá (`reason`) / mở khoá (`reason = null`) */
export function useSetCustomerLock(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string | null) =>
      reason === null ? customerApi.unlockCustomer(id) : customerApi.lockCustomer(id, reason),
    onSuccess: (customer) => {
      queryClient.setQueryData([...customersKey, 'detail', id], customer);
      queryClient.invalidateQueries({ queryKey: [...customersKey, 'list'] });
      // Chip "Đã khoá" ở chi tiết đơn
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
    },
  });
}
