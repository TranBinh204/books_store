'use client';

import { useSnackbar } from 'notistack';
import { useEffect, useRef } from 'react';
import { errorMessage } from '@/lib/form';
import { useCartMode, useMergeGuestCart } from '../hooks/useCart';
import { useGuestCart } from '../store/guest-cart.store';

/**
 * Chạy ngầm (đặt 1 lần trong Header cửa hàng):
 * 1. Nạp giỏ khách từ localStorage SAU khi trang hydrate.
 * 2. Khách hàng vừa đăng nhập mà trình duyệt còn giỏ khách → gộp vào giỏ tài khoản, xoá giỏ khách.
 */
export function CartSync() {
  const { enqueueSnackbar } = useSnackbar();
  const mode = useCartMode();
  const hydrated = useGuestCart((state) => state.hydrated);
  const guestCount = useGuestCart((state) => state.items.length);
  const merge = useMergeGuestCart();
  const merging = useRef(false);

  useEffect(() => {
    void useGuestCart.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (mode !== 'customer' || !hydrated || guestCount === 0 || merging.current) return;
    merging.current = true;
    merge.mutate(undefined, {
      onSuccess: (merged) => {
        if (merged > 0) {
          enqueueSnackbar(`Đã thêm ${merged} sản phẩm từ giỏ hàng trước khi đăng nhập`, {
            variant: 'success',
          });
        }
      },
      onError: (error) =>
        enqueueSnackbar(`Không gộp được giỏ hàng: ${errorMessage(error)}`, { variant: 'warning' }),
      onSettled: () => {
        merging.current = false;
      },
    });
  }, [mode, hydrated, guestCount, merge, enqueueSnackbar]);

  return null;
}
