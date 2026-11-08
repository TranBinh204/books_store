import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/PageLoading';
import { Dashboard } from '@/features/admin/dashboard';

export default function AdminHomePage() {
  // Dashboard đọc khoảng thời gian trên URL (useSearchParams) → cần Suspense để build (Next.js)
  return (
    <Suspense fallback={<PageLoading />}>
      <Dashboard />
    </Suspense>
  );
}
