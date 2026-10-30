import type { Metadata } from 'next';
import { CartPage } from '@/features/cart';
import { BestsellerSection } from '@/features/catalog';

export const metadata: Metadata = {
  title: 'Giỏ hàng',
  robots: { index: false, follow: false },
};

export default function CartRoute() {
  return <CartPage emptyExtra={<BestsellerSection />} />;
}
