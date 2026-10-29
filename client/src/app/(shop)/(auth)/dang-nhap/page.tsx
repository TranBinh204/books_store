import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/PageLoading';
import { LoginForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default function LoginPage() {
  // Component đọc ?query bằng useSearchParams → cần Suspense để build trang tĩnh (Next.js)
  return (
    <Suspense fallback={<PageLoading />}>
      <LoginForm />
    </Suspense>
  );
}
