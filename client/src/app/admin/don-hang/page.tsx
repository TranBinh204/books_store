import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/PageLoading';
import { AdminOrderList } from '@/features/admin/orders';

export const metadata: Metadata = { title: 'Đơn hàng' };

export default function AdminOrdersPage() {
  // Component đọc ?query bằng useSearchParams → cần Suspense để build trang tĩnh (Next.js)
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminOrderList />
    </Suspense>
  );
}
