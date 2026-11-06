import { http } from '@/lib/http';
import type {
  AdminFlashSale,
  AdminFlashSaleDetail,
  AdminFlashSaleParams,
  FlashSalePayload,
} from '../types';

export async function listFlashSales(params: AdminFlashSaleParams) {
  const { data, meta } = await http.get<AdminFlashSale[]>('/admin/flash-sales', {
    query: { ...params },
  });
  return { items: data, meta };
}

export async function getFlashSale(id: number) {
  return (await http.get<AdminFlashSaleDetail>(`/admin/flash-sales/${id}`)).data;
}

export async function createFlashSale(payload: FlashSalePayload) {
  return (await http.post<AdminFlashSaleDetail>('/admin/flash-sales', payload)).data;
}

export async function updateFlashSale(id: number, payload: FlashSalePayload) {
  return (await http.put<AdminFlashSaleDetail>(`/admin/flash-sales/${id}`, payload)).data;
}

export async function stopFlashSale(id: number) {
  return (await http.post<AdminFlashSaleDetail>(`/admin/flash-sales/${id}/stop`)).data;
}

export async function deleteFlashSale(id: number) {
  await http.delete(`/admin/flash-sales/${id}`);
}
