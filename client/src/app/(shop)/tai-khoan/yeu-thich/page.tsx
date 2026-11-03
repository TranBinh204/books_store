import type { Metadata } from 'next';
import { WishlistPage } from '@/features/wishlist';

export const metadata: Metadata = { title: 'Sách yêu thích' };

export default function MyWishlistPage() {
  return <WishlistPage />;
}
