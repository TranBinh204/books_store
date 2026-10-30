import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/PageLoading';
import { OrderList } from '@/features/order';

export const metadata: Metadata = { title: 'Đơn hàng của tôi' };

export default function MyOrdersPage() {
  // Component đọc ?query bằng useSearchParams → cần Suspense để build trang tĩnh (Next.js)
  return (
    <Suspense fallback={<PageLoading />}>
      <OrderList />
    </Suspense>
  );
}
