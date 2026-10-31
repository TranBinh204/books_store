import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CustomerDetail } from '@/features/admin/customers';

export const metadata: Metadata = { title: 'Chi tiết khách hàng' };

export default async function AdminCustomerDetailPage({
  params,
}: PageProps<'/admin/khach-hang/[id]'>) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <CustomerDetail id={id} />;
}
