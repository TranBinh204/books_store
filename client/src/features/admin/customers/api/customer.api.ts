import { http } from '@/lib/http';
import type { CustomerDetail, CustomerListParams, CustomerRow } from '../types';

export async function listCustomers(params: CustomerListParams) {
  const { data, meta } = await http.get<CustomerRow[]>('/admin/customers', {
    query: { ...params },
  });
  return { items: data, meta };
}

export async function getCustomer(id: number) {
  return (await http.get<CustomerDetail>(`/admin/customers/${id}`)).data;
}

export async function lockCustomer(id: number, reason: string) {
  return (await http.post<CustomerDetail>(`/admin/customers/${id}/lock`, { reason })).data;
}

export async function unlockCustomer(id: number) {
  return (await http.post<CustomerDetail>(`/admin/customers/${id}/unlock`)).data;
}
