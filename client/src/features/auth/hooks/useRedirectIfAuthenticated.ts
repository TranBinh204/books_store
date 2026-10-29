'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { afterLoginPath } from '../utils/redirect';
import { useCurrentUser } from './useAuth';

/**
 * Trang đăng nhập / đăng ký: đang đăng nhập → chuyển đi
 * (Admin → /admin, KH → `?next=` nếu được phép, vd /gio-hang — không thì trang chủ)
 */
export function useRedirectIfAuthenticated() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (user) router.replace(afterLoginPath(user.role, next));
  }, [user, router, next]);
}
