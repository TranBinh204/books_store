import type { Metadata } from 'next';
import { InventoryPage } from '@/features/admin/books';

export const metadata: Metadata = { title: 'Tồn kho' };

export default function AdminInventoryPage() {
  return <InventoryPage />;
}
