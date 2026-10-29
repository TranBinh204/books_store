import type { Metadata } from 'next';
import { AuthorManager } from '@/features/admin/named-entities';

export const metadata: Metadata = { title: 'Tác giả' };

export default function AdminAuthorsPage() {
  return <AuthorManager />;
}
