'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as catalogApi from '../api/catalog.api';
import type { BookListParams } from '../types/catalog.types';

export const catalogKeys = {
  books: (params: BookListParams) => ['catalog', 'books', params] as const,
};

/** Danh sách sách đang bán (phía trình duyệt) */
export function useBooks(params: BookListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: catalogKeys.books(params),
    queryFn: () => catalogApi.listBooks(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled,
  });
}
