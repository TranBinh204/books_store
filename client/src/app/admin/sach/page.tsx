import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageLoading } from '@/components/ui/PageLoading';
import { BookList } from '@/features/admin/books';

export const metadata: Metadata = { title: 'Sách' };

export default function AdminBooksPage() {
  // BookList đọc ?stock= (useSearchParams) → cần Suspense để build (Next.js)
  return (
    <Suspense fallback={<PageLoading />}>
      <BookList />
    </Suspense>
  );
}
