import type { BookFlashSale } from './flash-sale.types';

export type CoverType = 'PAPERBACK' | 'HARDCOVER';
/** Còn hàng / sắp hết (≤ LOW_STOCK_THRESHOLD) / hết hàng */
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type InventoryReason = 'IMPORT' | 'ADJUST' | 'ORDER' | 'CANCEL';

export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  sortOrder: number;
  isActive: boolean;
  /** Icon giao diện (null = icon sách mặc định) */
  iconKey: string | null;
  /** Mô tả ngắn hiện ở đầu trang danh mục (null = chưa có) */
  description: string | null;
  bookCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryNode extends Category {
  children: Category[];
}

/** Tác giả / nhà xuất bản — chỉ có tên */
export interface NamedEntity {
  id: number;
  name: string;
  bookCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdName {
  id: number;
  name: string;
}

export interface BookImage {
  id: number;
  url: string;
  publicId: string;
  sortOrder: number;
}

/** Một dòng trong bảng danh sách sách (Admin) */
export interface BookListItem {
  id: number;
  title: string;
  coverUrl: string | null;
  authors: IdName[];
  category: IdName;
  originalPrice: number;
  price: number;
  stock: number;
  stockStatus: StockStatus;
  soldCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookDetail extends Omit<BookListItem, 'coverUrl' | 'category'> {
  category: IdName & { parentId: number | null };
  publisher: IdName | null;
  isbn: string | null;
  description: string | null;
  publishYear: number | null;
  pages: number | null;
  size: string | null;
  weightGram: number | null;
  coverType: CoverType | null;
  images: BookImage[];
}

// ---------- Cửa hàng (API công khai) — không lộ tồn kho chính xác, trạng thái ẩn ----------

/** Danh mục đang hiển thị; `bookCount` = số sách đang bán (danh mục cha tính cả con) */
export interface PublicCategory {
  id: number;
  parentId: number | null;
  name: string;
  iconKey: string | null;
  bookCount: number;
}

/** Dòng đọc từ DB: PublicCategory + mô tả (chỉ trang danh mục dùng) */
export interface PublicCategoryRow extends PublicCategory {
  description: string | null;
}

export interface PublicCategoryNode extends PublicCategory {
  children: PublicCategory[];
}

/** 1 danh mục + danh mục cha (breadcrumb) + danh mục con */
export interface PublicCategoryDetail extends PublicCategory {
  /** Mô tả ngắn (null = chưa có) */
  description: string | null;
  parent: IdName | null;
  children: PublicCategory[];
}

/** Thẻ sách trên cửa hàng */
export interface PublicBookListItem {
  id: number;
  title: string;
  coverUrl: string | null;
  authors: IdName[];
  originalPrice: number;
  price: number;
  discountPercent: number;
  stockStatus: StockStatus;
  soldCount: number;
  /** Điểm sao trung bình (0 khi chưa có đánh giá) + số đánh giá đang hiện — tính lại mỗi khi có đánh giá (M10) */
  ratingAvg: number;
  ratingCount: number;
  /** Sách mới: tạo trong vòng NEW_BOOK_DAYS ngày → tem "Mới" trên thẻ sách */
  isNew: boolean;
  /**
   * Flash sale đang chạy (M12) — `price` vẫn là giá thường, client hiện `flashSale.salePrice`.
   * Thẻ sách: null khi hết suất · chi tiết sách: vẫn trả (hiện "Đã hết suất")
   */
  flashSale: BookFlashSale | null;
}

export interface PublicBookDetail extends PublicBookListItem {
  images: Omit<BookImage, 'publicId'>[];
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
  /** Số lượng tối đa được chọn = tồn kho, tối đa BOOK_MAX_SELECT_QUANTITY */
  maxQuantity: number;
}

/** Cột lọc trang danh mục: NXB có sách đang bán trong danh mục */
export interface PublisherFacet extends IdName {
  bookCount: number;
}

/** Gợi ý khi gõ ô tìm kiếm */
export type BookSuggestion = Pick<
  PublicBookListItem,
  'id' | 'title' | 'coverUrl' | 'authors' | 'price' | 'originalPrice'
>;

export interface InventoryLog {
  id: number;
  book: IdName;
  change: number;
  stockAfter: number;
  reason: InventoryReason;
  orderId: number | null;
  note: string | null;
  createdBy: IdName | null;
  createdAt: Date;
}
