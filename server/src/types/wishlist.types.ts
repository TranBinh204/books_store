import type { PublicBookListItem } from './catalog.types';

// Sách yêu thích (M09)

/** 1 sách trong danh sách yêu thích = dữ liệu thẻ sách M03 + trạng thái */
export interface WishlistItem extends PublicBookListItem {
  /** false = sách đã bị ẩn / ngừng kinh doanh sau khi lưu (quy tắc 5) */
  isAvailable: boolean;
  addedAt: Date;
}
