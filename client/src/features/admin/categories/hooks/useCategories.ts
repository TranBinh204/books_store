'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as categoryApi from '../api/category.api';
import type { CategoryPayload } from '../api/category.api';

export const categoriesKey = ['admin', 'categories'] as const;

export function useCategories() {
  return useQuery({ queryKey: categoriesKey, queryFn: categoryApi.listCategories });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: CategoryPayload }) =>
      id ? categoryApi.updateCategory(id, payload) : categoryApi.createCategory(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  });
}

export function useToggleCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      categoryApi.updateCategory(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: categoryApi.deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  });
}
