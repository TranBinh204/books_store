import { http } from '@/lib/http';
import type { AdminVoucher, AdminVoucherParams, VoucherOrderUsage, VoucherPayload } from '../types';

export async function listVouchers(params: AdminVoucherParams) {
  const { data, meta } = await http.get<AdminVoucher[]>('/admin/vouchers', {
    query: { ...params },
  });
  return { items: data, meta };
}

export async function createVoucher(payload: VoucherPayload) {
  return (await http.post<AdminVoucher>('/admin/vouchers', payload)).data;
}

export async function updateVoucher(id: number, payload: Partial<VoucherPayload>) {
  return (await http.patch<AdminVoucher>(`/admin/vouchers/${id}`, payload)).data;
}

export async function deleteVoucher(id: number) {
  await http.delete(`/admin/vouchers/${id}`);
}

export async function listVoucherOrders(id: number, params: { page: number; limit: number }) {
  const { data, meta } = await http.get<VoucherOrderUsage[]>(`/admin/vouchers/${id}/orders`, {
    query: params,
  });
  return { items: data, meta };
}
