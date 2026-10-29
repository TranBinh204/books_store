import { http } from '@/lib/http';
import type { NamedEntity } from '../../catalog-types';

export type NamedEntityResource = 'authors' | 'publishers';

export interface ListParams {
  q?: string;
  page: number;
  limit: number;
}

export async function listNamedEntities(resource: NamedEntityResource, params: ListParams) {
  return http.get<NamedEntity[]>(`/admin/${resource}`, { query: { ...params } });
}

export async function createNamedEntity(resource: NamedEntityResource, name: string) {
  return (await http.post<NamedEntity>(`/admin/${resource}`, { name })).data;
}

export async function renameNamedEntity(resource: NamedEntityResource, id: number, name: string) {
  return (await http.patch<NamedEntity>(`/admin/${resource}/${id}`, { name })).data;
}

export async function deleteNamedEntity(resource: NamedEntityResource, id: number) {
  await http.delete<void>(`/admin/${resource}/${id}`);
}
