import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookEditPage } from '@/features/admin/books';

export const metadata: Metadata = { title: 'Sửa sách' };

export default async function AdminEditBookPage({ params }: PageProps<'/admin/sach/[id]'>) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <BookEditPage id={id} />;
}
