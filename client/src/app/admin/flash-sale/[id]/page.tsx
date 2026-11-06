import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FlashSaleEditPage } from '@/features/admin/flash-sales';

export const metadata: Metadata = { title: 'Sửa Flash Sale' };

export default async function AdminEditFlashSalePage({
  params,
}: PageProps<'/admin/flash-sale/[id]'>) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <FlashSaleEditPage id={id} />;
}
