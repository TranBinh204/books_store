import type { PublicBookListItem } from './catalog.types';
import type { CurrentFlashSale } from './flash-sale.types';
import type { PublicVoucher } from './voucher.types';

// GET /api/home — dữ liệu công khai của trang chủ gom 1 lần (docs/06-ui-ux/shop/01-trang-chu.md mục 4.2)

export interface HomeStats {
  /** Sách đang bán */
  bookCount: number;
  /** Tài khoản khách hàng đang hoạt động */
  customerCount: number;
  /** Điểm trung bình mọi đánh giá đang hiện (null khi chưa có) */
  avgRating: number | null;
}

/** Sách nổi bật (khối "Truyền thuyết") — kèm đoạn tóm tắt */
export interface HomeFeaturedBook extends PublicBookListItem {
  excerpt: string;
}

export interface HomeAuthor {
  id: number;
  name: string;
  bookCount: number;
  /** Danh mục có nhiều sách nhất của tác giả */
  mainCategory: string | null;
}

export interface HomeReview {
  rating: number;
  content: string;
  /** Tên rút gọn: "Nguyễn Văn An" → "Nguyễn V. An" */
  userName: string;
  province: string | null;
  book: { id: number; title: string; coverUrl: string | null };
}

export interface HomeData {
  stats: HomeStats | null;
  featured: HomeFeaturedBook[];
  flashSale: CurrentFlashSale | null;
  vouchers: PublicVoucher[];
  bestsellers: PublicBookListItem[];
  newest: PublicBookListItem[];
  authors: HomeAuthor[];
  reviews: HomeReview[];
}
