'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { useCurrentUser } from '../hooks/useAuth';
import type { UserRole } from '../types/auth.types';

/**
 * Chặn trang theo vai trò ở phía client (token lưu ở localStorage / sessionStorage nên chỉ client kiểm tra được).
 * Chưa đăng nhập → /dang-nhap; sai vai trò → trang chủ. Server vẫn kiểm tra quyền ở mọi API.
 */
export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const router = useRouter();
  const { data: user, isPending } = useCurrentUser();

  useEffect(() => {
    if (isPending) return;
    if (!user) router.replace('/dang-nhap');
    else if (user.role !== role) router.replace('/');
  }, [isPending, user, role, router]);

  if (isPending || !user || user.role !== role) {
    return (
      <Spinner fill />
    );
  }

  return children;
}
