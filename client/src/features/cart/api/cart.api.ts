import { http } from '@/lib/http';
import type { Cart, CartAdjustment, CartLine } from '../types';

type CartWithAdjustment = { cart: Cart; adjustment: CartAdjustment | null };

/** Giỏ của khách (lưu ở trình duyệt) → thông tin hiện tại từng sách */
export async function previewCart(items: CartLine[]) {
  return (await http.post<Cart>('/cart/preview', { items })).data;
}

export async function getMyCart() {
  return (await http.get<Cart>('/me/cart')).data;
}

export async function addItem(line: CartLine) {
  return (await http.post<CartWithAdjustment>('/me/cart/items', line)).data;
}

export async function setQuantity({ bookId, quantity }: CartLine) {
  return (await http.patch<CartWithAdjustment>(`/me/cart/items/${bookId}`, { quantity })).data;
}

export async function removeItem(bookId: number) {
  return (await http.delete<Cart>(`/me/cart/items/${bookId}`)).data;
}

export async function clearCart() {
  await http.delete<void>('/me/cart');
}

/** Gộp giỏ trình duyệt vào giỏ tài khoản (sau khi đăng nhập) */
export async function mergeCart(items: CartLine[]) {
  return (await http.post<{ cart: Cart; merged: number }>('/me/cart/merge', { items })).data;
}
