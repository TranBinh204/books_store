// Kiểu dữ liệu dùng chung cho các màn hình quản trị sách — khớp server/src/types/catalog.types.ts

export interface IdName {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  parentId: number | null;
  name: string;
  sortOrder: number;
  isActive: boolean;
  /** Icon trên cửa hàng (components/ui/Icon) — null: icon sách mặc định */
  iconKey: string | null;
  /** Mô tả ngắn hiện ở đầu trang danh mục — null: chưa có */
  description: string | null;
  bookCount: number;
}

export interface CategoryNode extends Category {
  children: Category[];
}

export interface NamedEntity {
  id: number;
  name: string;
  bookCount: number;
}

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type CoverType = 'PAPERBACK' | 'HARDCOVER';
export type InventoryReason = 'IMPORT' | 'ADJUST' | 'ORDER' | 'CANCEL';

export interface UploadedImage {
  url: string;
  publicId: string;
}

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
  createdAt: string;
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
  images: (UploadedImage & { id: number; sortOrder: number })[];
}

export interface InventoryLog {
  id: number;
  book: IdName;
  change: number;
  stockAfter: number;
  reason: InventoryReason;
  note: string | null;
  createdBy: IdName | null;
  createdAt: string;
}

export const INVENTORY_REASON_LABEL: Record<InventoryReason, string> = {
  IMPORT: 'Nhập hàng',
  ADJUST: 'Điều chỉnh',
  ORDER: 'Bán (đơn hàng)',
  CANCEL: 'Hoàn (huỷ đơn)',
};

export const COVER_TYPE_LABEL: Record<CoverType, string> = {
  PAPERBACK: 'Bìa mềm',
  HARDCOVER: 'Bìa cứng',
};

export const STOCK_STATUS: Record<
  StockStatus,
  { label: string; color: 'success' | 'warning' | 'error' }
> = {
  IN_STOCK: { label: 'Còn hàng', color: 'success' },
  LOW_STOCK: { label: 'Sắp hết', color: 'warning' },
  OUT_OF_STOCK: { label: 'Hết hàng', color: 'error' },
};
