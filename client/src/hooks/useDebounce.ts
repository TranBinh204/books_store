'use client';

import { useEffect, useState } from 'react';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';

/**
 * Trả về `value` sau khi nó ngừng thay đổi `delay` ms — dùng cho ô tìm kiếm / lọc,
 * tránh gọi API mỗi lần gõ phím. Mặc định SEARCH_DEBOUNCE_MS (lib/constants.ts).
 */
export function useDebounce<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
