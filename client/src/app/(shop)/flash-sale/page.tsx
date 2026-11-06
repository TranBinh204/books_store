import type { Metadata } from 'next';
import { FlashSalePage } from '@/features/flash-sale';

export const metadata: Metadata = { title: 'Flash Sale' };

export default function FlashSaleRoute() {
  return <FlashSalePage />;
}
