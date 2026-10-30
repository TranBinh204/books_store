import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrderPlaced } from '@/features/order';

export const metadata: Metadata = { title: 'Đặt hàng thành công' };

/** Đặt hàng xong (COD) chuyển về đây kèm `?don=<id đơn>` */
export default async function OrderPlacedPage({
  searchParams,
}: {
  searchParams: Promise<{ don?: string }>;
}) {
  const id = Number((await searchParams).don);
  if (!Number.isInteger(id) || id <= 0) redirect('/tai-khoan/don-hang');
  return <OrderPlaced id={id} />;
}
