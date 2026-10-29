import { http } from '@/lib/http';
import type { Category, CategoryNode } from '../../catalog-types';

export interface CategoryPayload {
  name: string;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  iconKey: string | null;
  description: string | null;
}

export async function listCategories() {
  return (await http.get<CategoryNode[]>('/admin/categories')).data;
}

export async function createCategory(payload: CategoryPayload) {
  return (await http.post<Category>('/admin/categories', payload)).data;
}

export async function updateCategory(id: number, payload: Partial<CategoryPayload>) {
  return (await http.patch<Category>(`/admin/categories/${id}`, payload)).data;
}

export async function deleteCategory(id: number) {
  await http.delete<void>(`/admin/categories/${id}`);
}
