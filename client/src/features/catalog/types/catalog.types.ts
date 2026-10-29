import type { BookFlashSale } from '@/features/flash-sale/types';

// Dữ liệu API công khai của cửa hàng — khớp server/src/types/catalog.types.ts (phần "Cửa hàng")

export interface IdName {
  id: number;
  name: string;
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type CoverType = 'PAPERBACK' | 'HARDCOVER';

export interface PublicCategory {
  id: number;
  parentId: number | null;
  name: string;
  /** Số sách đang bán (danh mục cha tính cả con) */
  bookCount: number;
  /** Khóa icon (components/ui/Icon) — null: icon sách mặc định */
  iconKey?: string | null;
}

export interface PublicCategoryNode extends PublicCategory {
  children: PublicCategory[];
}

export interface PublicCategoryDetail extends PublicCategory {
  /** Mô tả ngắn (null: chưa có) — chỉ API chi tiết trả */
  description: string | null;
  parent: IdName | null;
  children: PublicCategory[];
}

/** Dữ liệu thẻ sách */
export interface BookCardItem {
  id: number;
  title: string;
  coverUrl: string | null;
  authors: IdName[];
  originalPrice: number;
  price: number;
  discountPercent: number;
  stockStatus: StockStatus;
  soldCount: number;
  /** Điểm sao + số đánh giá đang hiện (A1) */
  ratingAvg: number;
  ratingCount: number;
  /** Sách mới (tạo trong vòng NEW_BOOK_DAYS ngày) → tem "Mới" */
  isNew: boolean;
  /**
   * Flash sale đang chạy (M12) — `price` vẫn là giá thường.
   * Thẻ sách: null khi hết suất · chi tiết & khối Flash Sale: vẫn có (hiện "Hết suất")
   */
  flashSale: BookFlashSale | null;
}

export interface PublicBookDetail extends BookCardItem {
  images: { id: number; url: string; sortOrder: number }[];
  publisher: IdName | null;
  category: IdName & { parent: IdName | null };
  isbn: string | null;
  description: string | null;
  publishYear: number | null;
  pages: number | null;
  size: string | null;
  weightGram: number | null;
  coverType: CoverType | null;
  ratingAvg: number;
  ratingCount: number;
  maxQuantity: number;
}

export interface PublisherFacet extends IdName {
  bookCount: number;
}

export type BookSuggestion = Pick<
  BookCardItem,
  'id' | 'title' | 'coverUrl' | 'price' | 'originalPrice'
> & {
  /** Tác giả (hiện dưới tên sách trong ô gợi ý) — server bổ sung ở bước API */
  authors?: IdName[];
};

export type BookSort =
  | 'created_desc'
  | 'created_asc'
  | 'sold_desc'
  | 'price_asc'
  | 'price_desc'
  | 'title_asc'
  | 'title_desc'
  | 'relevance';

/** Tham số GET /api/books */
export interface BookListParams {
  q?: string;
  categoryId?: number;
  authorId?: number;
  publisherIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  sort?: BookSort;
  page?: number;
  limit?: number;
}
