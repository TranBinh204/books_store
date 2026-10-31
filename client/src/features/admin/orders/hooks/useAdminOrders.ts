'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as orderApi from '../api/admin-order.api';
import type { AdminOrderDetail, AdminOrderListParams } from '../types';

export const adminOrdersKey = ['admin', 'orders'] as const;

/** Badge menu & tab tự cập nhật (M08 Q11) */
const COUNTS_REFRESH_MS = 60_000;

export function useAdminOrders(params: AdminOrderListParams) {
  return useQuery({
    queryKey: [...adminOrdersKey, 'list', params],
    queryFn: () => orderApi.listOrders(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrderCounts() {
  return useQuery({
    queryKey: [...adminOrdersKey, 'counts'],
    queryFn: orderApi.getOrderCounts,
    refetchInterval: COUNTS_REFRESH_MS,
  });
}

export function useAdminOrder(id: number) {
  return useQuery({
    queryKey: [...adminOrdersKey, 'detail', id],
    queryFn: () => orderApi.getOrder(id),
  });
}

/** Mọi thao tác trên 1 đơn → cập nhật chi tiết, làm mới danh sách & số đếm (cả thống kê khách) */
function useOrderMutation<T>(id: number, fn: (payload: T) => Promise<AdminOrderDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (order) => {
      queryClient.setQueryData([...adminOrdersKey, 'detail', id], order);
      queryClient.invalidateQueries({ queryKey: adminOrdersKey });
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
    },
  });
}

export function useChangeOrderStatus(id: number) {
  return useOrderMutation(id, (payload: Parameters<typeof orderApi.changeStatus>[1]) =>
    orderApi.changeStatus(id, payload),
  );
}

export function useAdminCancelOrder(id: number) {
  return useOrderMutation(id, (payload: Parameters<typeof orderApi.cancelOrder>[1]) =>
    orderApi.cancelOrder(id, payload),
  );
}

export function useRefundOrder(id: number) {
  return useOrderMutation(id, (note: string) => orderApi.refundOrder(id, note));
}
