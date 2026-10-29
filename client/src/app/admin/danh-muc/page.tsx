import type { Metadata } from 'next';
import { CategoryManager } from '@/features/admin/categories';

export const metadata: Metadata = { title: 'Danh mục' };

export default function AdminCategoriesPage() {
  return <CategoryManager />;
}
