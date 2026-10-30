'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth';
import * as cartApi from '../api/cart.api';
import { useGuestCart } from '../store/guest-cart.store';
import { EMPTY_CART, type Cart, type CartAdjustment, type CartLine } from '../types';

// Giỏ hàng (M05) — 1 bộ hook chung: tự chọn giỏ khách (localStorage) hay giỏ tài khoản (server).
// docs/03-modules/05-cart.md mục 3

/** Khớp server: mỗi sách tối đa 99, giỏ tối đa 50 đầu sách */
export const CART_MAX_QUANTITY = 99;
export const CART_MAX_ITEMS = 50;

export const cartKeys = {
  mine: ['cart', 'mine'] as const,
  preview: (lines: CartLine[]) => ['cart', 'preview', lines] as const,
};

/** loading: đang biết ai đăng nhập · guest: khách · customer: khách hàng · admin: không mua hàng */
export type CartMode = 'loading' | 'guest' | 'customer' | 'admin';

export function useCartMode(): CartMode {
  const { data: user, isPending } = useCurrentUser();
  if (isPending) return 'loading';
  if (!user) return 'guest';
  return user.role === 'CUSTOMER' ? 'customer' : 'admin';
}

/** Lỗi nghiệp vụ phía client (câu hiển thị được cho người dùng) */
export class CartError extends Error {}

export function useCart(): { mode: CartMode; cart: Cart; isPending: boolean } {
  const mode = useCartMode();
  const guestItems = useGuestCart((state) => state.items);
  const hydrated = useGuestCart((state) => state.hydrated);

  const mine = useQuery({
    queryKey: cartKeys.mine,
    queryFn: cartApi.getMyCart,
    enabled: mode === 'customer',
  });
  const guest = useQuery({
    queryKey: cartKeys.preview(guestItems),
    queryFn: () => cartApi.previewCart(guestItems),
    enabled: mode === 'guest' && guestItems.length > 0,
    placeholderData: keepPreviousData,
  });

  if (mode === 'customer')
    return { mode, cart: mine.data ?? EMPTY_CART, isPending: mine.isPending };
  if (mode === 'guest') {
    if (guestItems.length === 0) return { mode, cart: EMPTY_CART, isPending: !hydrated };
    return { mode, cart: guest.data ?? EMPTY_CART, isPending: guest.isPending };
  }
  return { mode, cart: EMPTY_CART, isPending: mode === 'loading' };
}

/** Số trên icon giỏ = tổng số lượng (khách: tính ngay từ localStorage, không chờ server) */
export function useCartCount() {
  const { mode, cart } = useCart();
  const guestItems = useGuestCart((state) => state.items);
  if (mode === 'guest') return guestItems.reduce((sum, item) => sum + item.quantity, 0);
  return cart.totalQuantity;
}

function assertCanBuy(mode: CartMode) {
  if (mode === 'admin') throw new CartError('Tài khoản quản trị không thể mua hàng');
  if (mode === 'loading') throw new CartError('Đang tải thông tin tài khoản, vui lòng thử lại');
}

/**
 * Thêm vào giỏ (cộng dồn). Vượt min(tồn kho, 99) → giảm về mức tối đa, trả `adjustment`.
 * Khách: hỏi server tồn kho hiện tại rồi mới lưu localStorage.
 */
export function useAddToCart() {
  const mode = useCartMode();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookId, quantity }: CartLine): Promise<CartAdjustment | null> => {
      assertCanBuy(mode);
      if (mode === 'customer') {
        const { cart, adjustment } = await cartApi.addItem({ bookId, quantity });
        queryClient.setQueryData(cartKeys.mine, cart);
        return adjustment;
      }

      const { items, set } = useGuestCart.getState();
      const existing = items.find((item) => item.bookId === bookId);
      if (!existing && items.length >= CART_MAX_ITEMS) {
        throw new CartError(`Giỏ hàng tối đa ${CART_MAX_ITEMS} sản phẩm — hãy xoá bớt`);
      }
      const requested = (existing?.quantity ?? 0) + quantity;
      const [item] = (
        await cartApi.previewCart([{ bookId, quantity: Math.min(requested, CART_MAX_QUANTITY) }])
      ).items;
      if (!item || item.issue === 'UNAVAILABLE') {
        throw new CartError('Sản phẩm không còn kinh doanh');
      }
      if (item.issue === 'OUT_OF_STOCK') throw new CartError('Sản phẩm đã hết hàng');

      const quantityToSave = Math.min(requested, item.maxQuantity);
      set(bookId, quantityToSave);
      return requested > quantityToSave ? { bookId, requested, quantity: quantityToSave } : null;
    },
  });
}

/** Đặt số lượng 1 dòng (khách: lưu ngay; tài khoản: server giảm về tối đa nếu vượt) */
export function useSetCartQuantity() {
  const mode = useCartMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookId, quantity }: CartLine) => {
      assertCanBuy(mode);
      if (mode === 'customer') {
        const { cart } = await cartApi.setQuantity({ bookId, quantity });
        queryClient.setQueryData(cartKeys.mine, cart);
      } else {
        useGuestCart.getState().set(bookId, quantity);
      }
    },
  });
}

export function useRemoveFromCart() {
  const mode = useCartMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookId: number) => {
      if (mode === 'customer') {
        queryClient.setQueryData(cartKeys.mine, await cartApi.removeItem(bookId));
      } else {
        useGuestCart.getState().remove(bookId);
      }
    },
  });
}

export function useClearCart() {
  const mode = useCartMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (mode === 'customer') {
        await cartApi.clearCart();
        queryClient.setQueryData(cartKeys.mine, EMPTY_CART);
      } else {
        useGuestCart.getState().clear();
      }
    },
  });
}

/** Gộp giỏ trình duyệt vào giỏ tài khoản (CartSync gọi khi khách hàng vừa đăng nhập) */
export function useMergeGuestCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { items, clear } = useGuestCart.getState();
      const result = await cartApi.mergeCart(items);
      clear();
      queryClient.setQueryData(cartKeys.mine, result.cart);
      return result.merged;
    },
  });
}
