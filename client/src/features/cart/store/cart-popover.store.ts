'use client';

import { create } from 'zustand';

/** Giỏ hàng nhanh (hộp thả xuống dưới icon giỏ ở Header) — mở khi rê chuột / chạm icon giỏ / vừa thêm sách */
export const useCartPopover = create<{ open: boolean; setOpen: (open: boolean) => void }>()(
  (setState) => ({ open: false, setOpen: (open) => setState({ open }) }),
);
