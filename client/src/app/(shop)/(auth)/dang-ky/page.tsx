import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/PageLoading';
import { RegisterForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Đăng ký tài khoản' };

export default function RegisterPage() {
  // Component đọc ?query bằng useSearchParams → cần Suspense để build trang tĩnh (Next.js)
  return (
    <Suspense fallback={<PageLoading />}>
      <RegisterForm />
    </Suspense>
  );
}
