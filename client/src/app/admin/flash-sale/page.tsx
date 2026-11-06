import type { Metadata } from 'next';
import { FlashSaleList } from '@/features/admin/flash-sales';

export const metadata: Metadata = { title: 'Flash Sale' };

export default function AdminFlashSalesPage() {
  return <FlashSaleList />;
}
