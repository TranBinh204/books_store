'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Đổi bộ lọc / sắp xếp = đổi query trên URL → Server Component tải lại danh sách.
 * Chạy trong transition: giữ nội dung cũ (làm mờ bằng `pending`) tới khi dữ liệu mới về.
 */
export function useListingUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  /** `undefined` / rỗng → xoá tham số khỏi URL */
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const query = next.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return { update, pending };
}
