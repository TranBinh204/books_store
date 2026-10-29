import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/PageHeader';
import { BookForm } from '@/features/admin/books';

export const metadata: Metadata = { title: 'Thêm sách' };

export default function AdminNewBookPage() {
  return (
    <>
      <PageHeader title="Thêm sách" back={{ href: '/admin/sach', label: 'Danh sách sách' }} />
      <BookForm />
    </>
  );
}
