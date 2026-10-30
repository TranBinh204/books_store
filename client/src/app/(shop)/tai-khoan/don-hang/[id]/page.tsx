import type { Metadata } from 'next';
import { OrderDetailView } from '@/features/order';
import { idOrNotFound } from '@/lib/not-found';

export const metadata: Metadata = { title: 'Chi tiết đơn hàng' };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <OrderDetailView id={idOrNotFound((await params).id)} />;
}
