'use client';

import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { errorMessage } from '@/lib/form';
import { useCartPopover } from '../store/cart-popover.store';
import { useAddToCart, useCartMode } from './useCart';

/** Trang giỏ hàng — đích quay lại sau khi khách đăng nhập để thanh toán (M05 Q4) */
export const CART_PATH = '/gio-hang';
/** Trang thanh toán (M06) */
export const CHECKOUT_PATH = '/thanh-toan';

/**
 * Thêm vào giỏ + phản hồi: mở giỏ hàng nhanh (hoặc chuyển trang), báo khi bị giảm số lượng / lỗi.
 * `then`: 'drawer' (mặc định — THÊM VÀO GIỎ) · 'checkout' (MUA NGAY: khách hàng → trang thanh toán,
 * khách chưa đăng nhập → giỏ hàng để đăng nhập & gộp giỏ ở đó — M06 Q6) ·
 * 'toast' (nút thoi trên thẻ sách, demo 07: chỉ báo "Đã thêm “…” vào giỏ", không mở giỏ)
 */
export function useAddToCartWithFeedback() {
  const add = useAddToCart();
  const mode = useCartMode();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const openPopover = useCartPopover((state) => state.setOpen);

  const addToCart = (
    bookId: number,
    quantity = 1,
    then: 'drawer' | 'checkout' | 'toast' = 'drawer',
    title?: string,
  ) =>
    add.mutate(
      { bookId, quantity },
      {
        onSuccess: (adjustment) => {
          if (adjustment) {
            enqueueSnackbar(
              `Chỉ còn ${adjustment.quantity} sản phẩm — giỏ hàng đã có số lượng tối đa`,
              { variant: 'warning' },
            );
          }
          if (then === 'checkout') router.push(mode === 'customer' ? CHECKOUT_PATH : CART_PATH);
          else if (then === 'toast') {
            enqueueSnackbar(title ? `Đã thêm “${title}” vào giỏ` : 'Đã thêm vào giỏ', {
              variant: 'success',
            });
          } else openPopover(true);
        },
        onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
      },
    );

  return { addToCart, isPending: add.isPending };
}

/**
 * Nút THANH TOÁN: khách → đăng nhập rồi quay lại giỏ hàng (gộp giỏ) · khách hàng → trang thanh toán.
 */
export function useCheckout() {
  const mode = useCartMode();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const closePopover = useCartPopover((state) => state.setOpen);

  return () => {
    closePopover(false);
    if (mode === 'guest') {
      enqueueSnackbar('Vui lòng đăng nhập để thanh toán', { variant: 'info' });
      router.push(`/dang-nhap?next=${encodeURIComponent(CART_PATH)}`);
      return;
    }
    router.push(CHECKOUT_PATH);
  };
}
