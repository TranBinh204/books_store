'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartLine } from '../types';

/**
 * Giỏ của khách chưa đăng nhập — chỉ lưu (bookId, quantity) ở localStorage;
 * giá / tồn kho luôn hỏi server (POST /api/cart/preview). Mới thêm ở đầu danh sách.
 * `skipHydration`: nạp từ storage SAU khi trang hydrate (CartSync) → HTML server & client khớp nhau.
 */
interface GuestCartState {
  items: CartLine[];
  /** Đã nạp từ localStorage chưa (trước đó giỏ luôn rỗng) */
  hydrated: boolean;
  /** Đặt số lượng; chưa có → thêm lên đầu */
  set: (bookId: number, quantity: number) => void;
  remove: (bookId: number) => void;
  clear: () => void;
}

export const useGuestCart = create<GuestCartState>()(
  persist(
    (setState) => ({
      items: [],
      hydrated: false,
      set: (bookId, quantity) =>
        setState(({ items }) => ({
          items: items.some((item) => item.bookId === bookId)
            ? items.map((item) => (item.bookId === bookId ? { bookId, quantity } : item))
            : [{ bookId, quantity }, ...items],
        })),
      remove: (bookId) =>
        setState(({ items }) => ({ items: items.filter((item) => item.bookId !== bookId) })),
      clear: () => setState({ items: [] }),
    }),
    {
      name: 'bookstore.guestCart',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ items }) => ({ items }),
      skipHydration: true,
      onRehydrateStorage: () => () => useGuestCart.setState({ hydrated: true }),
    },
  ),
);
