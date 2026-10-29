import { http } from '@/lib/http';
import type { WishlistItem } from '../types';

export async function getWishlistIds() {
  return (await http.get<{ bookIds: number[] }>('/me/wishlist/ids')).data.bookIds;
}

export async function listWishlist(params: { page: number; limit: number }) {
  const { data, meta } = await http.get<WishlistItem[]>('/me/wishlist', { query: params });
  return { items: data, meta };
}

export async function addToWishlist(bookId: number) {
  return (await http.put<{ bookId: number; count: number }>(`/me/wishlist/${bookId}`)).data;
}

export async function removeFromWishlist(bookId: number) {
  await http.delete(`/me/wishlist/${bookId}`);
}
