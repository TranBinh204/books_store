import type { Metadata } from 'next';
import { FlashSaleCreatePage } from '@/features/admin/flash-sales';

export const metadata: Metadata = { title: 'Thêm Flash Sale' };

export default function AdminNewFlashSalePage() {
  return <FlashSaleCreatePage />;
}
