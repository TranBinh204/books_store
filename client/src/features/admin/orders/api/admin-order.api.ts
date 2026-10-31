import type { OrderStatus } from '@/features/order';
import { http } from '@/lib/http';
import type {
  AdminNextStatus,
  AdminOrderCounts,
  AdminOrderDetail,
  AdminOrderListParams,
  AdminOrderRow,
} from '../types';

export async function listOrders(params: AdminOrderListParams) {
  const { needsRefund, ...rest } = params;
  const { data, meta } = await http.get<AdminOrderRow[]>('/admin/orders', {
    query: { ...rest, needsRefund: needsRefund ? 'true' : undefined },
  });
  return { items: data, meta };
}

export async function getOrderCounts() {
  return (await http.get<{ counts: AdminOrderCounts }>('/admin/orders/summary')).data.counts;
}

export async function getOrder(id: number) {
  return (await http.get<AdminOrderDetail>(`/admin/orders/${id}`)).data;
}

export async function changeStatus(
  id: number,
  payload: { status: AdminNextStatus; expectedStatus: OrderStatus; note: string | null },
) {
  return (await http.post<AdminOrderDetail>(`/admin/orders/${id}/status`, payload)).data;
}

export async function cancelOrder(
  id: number,
  payload: { reason: string; expectedStatus: OrderStatus },
) {
  return (await http.post<AdminOrderDetail>(`/admin/orders/${id}/cancel`, payload)).data;
}

export async function refundOrder(id: number, note: string) {
  return (await http.post<AdminOrderDetail>(`/admin/orders/${id}/refund`, { note })).data;
}
