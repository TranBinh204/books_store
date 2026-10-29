'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { useCurrentUser } from '../hooks/useAuth';

/**
 * Chặn trang cần đăng nhập (mọi vai trò) ở phía client — vd `/tai-khoan/*`.
 * Chưa đăng nhập → /dang-nhap. Server vẫn kiểm tra quyền ở mọi API.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isPending } = useCurrentUser();

  useEffect(() => {
    if (!isPending && !user) router.replace('/dang-nhap');
  }, [isPending, user, router]);

  if (isPending || !user) {
    return <Spinner fill />;
  }

  return children;
}
