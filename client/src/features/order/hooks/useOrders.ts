'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as orderApi from '../api/order.api';
import type { CreateOrderPayload, OrderDetail, OrderStatus } from '../types';

export const orderKeys = {
  all: ['me', 'orders'] as const,
  list: (status: OrderStatus | undefined, page: number) =>
    ['me', 'orders', 'list', status ?? 'ALL', page] as const,
  counts: ['me', 'orders', 'counts'] as const,
  detail: (id: number) => ['me', 'orders', 'detail', id] as const,
};

/** Số đơn mỗi trang trong "Đơn hàng của tôi" */
export const ORDERS_PAGE_SIZE = 10;

export function useOrders(status: OrderStatus | undefined, page: number) {
  return useQuery({
    queryKey: orderKeys.list(status, page),
    queryFn: () => orderApi.listOrders({ status, page, limit: ORDERS_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

export function useOrderCounts() {
  return useQuery({ queryKey: orderKeys.counts, queryFn: orderApi.getOrderCounts });
}

/**
 * `poll(order)` → số ms tự tải lại (vd chờ IPN VNPay xác nhận thanh toán — M07) hoặc false.
 */
export function useOrder(id: number, poll?: (order: OrderDetail | undefined) => number | false) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderApi.getOrder(id),
    refetchInterval: poll ? (query) => poll(query.state.data) : false,
  });
}

/** Tạo đơn → làm mới giỏ hàng (các sách đã đặt bị xoá khỏi giỏ) & danh sách đơn */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      idempotencyKey,
    }: {
      payload: CreateOrderPayload;
      idempotencyKey: string;
    }) => orderApi.createOrder(payload, idempotencyKey),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      orderApi.cancelOrder(id, reason),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
