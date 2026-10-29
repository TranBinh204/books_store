import type { BookCardData } from '@/components/shop/BookCard';

// Sách yêu thích (M09) — khớp server/src/types/wishlist.types.ts

export interface WishlistItem extends BookCardData {
  /** false = sách đã bị ẩn / ngừng kinh doanh sau khi lưu */
  isAvailable: boolean;
  addedAt: string;
}
