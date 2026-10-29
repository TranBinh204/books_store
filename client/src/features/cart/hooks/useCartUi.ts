'use client';

import { useSnackbar } from 'notistack';

export function useAddToCartWithFeedback() {
  const { enqueueSnackbar } = useSnackbar();

  const addToCart = (
    _bookId: number,
    _quantity = 1,
    _then: 'drawer' | 'checkout' | 'toast' = 'drawer',
    title?: string,
  ) => {
    enqueueSnackbar(title ? `Đã thêm “${title}” vào giỏ` : 'Đã thêm vào giỏ hàng', {
      variant: 'success',
    });
  };

  return { addToCart, isPending: false };
}
