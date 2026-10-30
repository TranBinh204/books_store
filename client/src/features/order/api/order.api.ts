import { http } from '@/lib/http';
import type { CreateOrderPayload, OrderDetail, OrderStatus, OrderSummary } from '../types';

/** Tạo đơn — `idempotencyKey` cố định cho 1 lần mở trang thanh toán (gửi lại không ra đơn mới) */
export async function createOrder(payload: CreateOrderPayload, idempotencyKey: string) {
  return (
    await http.post<OrderDetail>('/me/orders', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
  ).data;
}

export async function listOrders(params: { status?: OrderStatus; page: number; limit: number }) {
  const { data, meta } = await http.get<OrderSummary[]>('/me/orders', { query: params });
  return { items: data, meta };
}

export async function getOrderCounts() {
  return (await http.get<{ counts: Partial<Record<OrderStatus, number>> }>('/me/orders/summary'))
    .data.counts;
}

export async function getOrder(id: number) {
  return (await http.get<OrderDetail>(`/me/orders/${id}`)).data;
}

export async function cancelOrder(id: number, reason: string) {
  return (await http.post<OrderDetail>(`/me/orders/${id}/cancel`, { reason })).data;
}
