'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as bookApi from '../api/book.api';
import type {
  BookListParams,
  BookPayload,
  InventoryLogParams,
  StockChangePayload,
} from '../api/book.api';

export const booksKey = ['admin', 'books'] as const;
export const inventoryLogsKey = ['admin', 'inventory-logs'] as const;

export function useBookList(params: BookListParams) {
  return useQuery({
    queryKey: [...booksKey, 'list', params],
    queryFn: () => bookApi.listBooks(params),
    placeholderData: keepPreviousData,
  });
}

export function useBook(id: number) {
  return useQuery({ queryKey: [...booksKey, 'detail', id], queryFn: () => bookApi.getBook(id) });
}

export function useSaveBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: BookPayload }) =>
      id ? bookApi.updateBook(id, payload) : bookApi.createBook(payload),
    onSuccess: (book) => {
      queryClient.invalidateQueries({ queryKey: booksKey });
      queryClient.setQueryData([...booksKey, 'detail', book.id], book);
    },
  });
}

export function useSetBookStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      bookApi.setBookStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: booksKey }),
  });
}

export function useChangeStock(bookId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StockChangePayload) => bookApi.changeStock(bookId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: booksKey });
      queryClient.invalidateQueries({ queryKey: inventoryLogsKey });
    },
  });
}

export function useInventoryLogs(params: InventoryLogParams) {
  return useQuery({
    queryKey: [...inventoryLogsKey, params],
    queryFn: () => bookApi.listInventoryLogs(params),
    placeholderData: keepPreviousData,
  });
}

export function useUploadImages() {
  return useMutation({ mutationFn: bookApi.uploadImages });
}
