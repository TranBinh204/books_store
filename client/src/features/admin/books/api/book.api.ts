import { http } from '@/lib/http';
import type {
  BookDetail,
  BookListItem,
  CoverType,
  InventoryLog,
  InventoryReason,
  UploadedImage,
} from '../../catalog-types';

export type BookSort =
  | 'created_desc'
  | 'created_asc'
  | 'title_asc'
  | 'price_asc'
  | 'price_desc'
  | 'stock_asc'
  | 'stock_desc'
  | 'sold_desc';

export interface BookListParams {
  q?: string;
  categoryId?: number;
  authorId?: number;
  publisherId?: number;
  status?: 'active' | 'hidden';
  stock?: 'low' | 'out';
  /** yyyy-mm-dd */
  createdFrom?: string;
  createdTo?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: BookSort;
  page: number;
  limit: number;
}

export interface BookPayload {
  title: string;
  categoryId: number;
  authorIds: number[];
  publisherId: number | null;
  isbn: string | null;
  description: string | null;
  publishYear: number | null;
  pages: number | null;
  size: string | null;
  weightGram: number | null;
  coverType: CoverType | null;
  originalPrice: number;
  price: number;
  isActive: boolean;
  images: UploadedImage[];
  /** Chỉ khi thêm mới */
  initialStock?: number;
}

export type StockChangePayload =
  | { type: 'IMPORT'; quantity: number; note?: string | null }
  | { type: 'ADJUST'; newStock: number; note: string };

export interface InventoryLogParams {
  /** Tìm theo tên sách */
  q?: string;
  bookId?: number;
  reason?: InventoryReason;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export function listBooks(params: BookListParams) {
  return http.get<BookListItem[]>('/admin/books', { query: { ...params } });
}

export async function getBook(id: number) {
  return (await http.get<BookDetail>(`/admin/books/${id}`)).data;
}

export async function createBook(payload: BookPayload) {
  return (await http.post<BookDetail>('/admin/books', payload)).data;
}

export async function updateBook(id: number, payload: BookPayload) {
  return (await http.patch<BookDetail>(`/admin/books/${id}`, payload)).data;
}

export async function setBookStatus(id: number, isActive: boolean) {
  return (await http.patch<BookDetail>(`/admin/books/${id}/status`, { isActive })).data;
}

export async function changeStock(id: number, payload: StockChangePayload) {
  return (await http.post<{ stock: number; change: number }>(`/admin/books/${id}/stock`, payload))
    .data;
}

export function listInventoryLogs(params: InventoryLogParams) {
  return http.get<InventoryLog[]>('/admin/inventory-logs', { query: { ...params } });
}

export async function uploadImages(files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  return (await http.post<UploadedImage[]>('/admin/uploads/images', form)).data;
}
