import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminOrderDetail } from '@/features/admin/orders';

export const metadata: Metadata = { title: 'Chi tiết đơn hàng' };

export default async function AdminOrderDetailPage({ params }: PageProps<'/admin/don-hang/[id]'>) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <AdminOrderDetail id={id} />;
}
