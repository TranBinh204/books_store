'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/named-entity.api';
import type { ListParams, NamedEntityResource } from '../api/named-entity.api';

export const namedEntitiesKey = (resource: NamedEntityResource) => ['admin', resource] as const;

export function useNamedEntityList(resource: NamedEntityResource, params: ListParams) {
  return useQuery({
    queryKey: [...namedEntitiesKey(resource), params],
    queryFn: () => api.listNamedEntities(resource, params),
    placeholderData: keepPreviousData,
  });
}

export function useSaveNamedEntity(resource: NamedEntityResource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id?: number; name: string }) =>
      id ? api.renameNamedEntity(resource, id, name) : api.createNamedEntity(resource, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: namedEntitiesKey(resource) }),
  });
}

export function useDeleteNamedEntity(resource: NamedEntityResource) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.deleteNamedEntity(resource, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: namedEntitiesKey(resource) }),
  });
}
