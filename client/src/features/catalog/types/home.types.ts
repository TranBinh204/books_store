import type { CurrentFlashSale } from '@/features/flash-sale/types';
import type { PublicVoucher } from '@/features/voucher/types';
import type { BookCardItem } from './catalog.types';

// GET /api/home — khớp server/src/types/home.types.ts (docs/06-ui-ux/shop/01-trang-chu.md mục 4.2)

export interface HomeStats {
  bookCount: number;
  customerCount: number;
  /** null khi chưa có đánh giá */
  avgRating: number | null;
}

export interface HomeFeaturedBook extends BookCardItem {
  excerpt: string;
}

export interface HomeAuthor {
  id: number;
  name: string;
  bookCount: number;
  mainCategory: string | null;
}

export interface HomeReview {
  rating: number;
  content: string;
  userName: string;
  province: string | null;
  book: { id: number; title: string; coverUrl: string | null };
}

export interface HomeData {
  stats: HomeStats | null;
  featured: HomeFeaturedBook[];
  flashSale: CurrentFlashSale | null;
  vouchers: PublicVoucher[];
  bestsellers: BookCardItem[];
  newest: BookCardItem[];
  authors: HomeAuthor[];
  reviews: HomeReview[];
}
