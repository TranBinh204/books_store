'use client';

import { create } from 'zustand';

/** Khung chat đang mở hay thu nhỏ (bong bóng 💬) */
export const useChatWidget = create<{ open: boolean; setOpen: (open: boolean) => void }>()(
  (setState) => ({ open: false, setOpen: (open) => setState({ open }) }),
);
