// Đánh giá sách (M10)

/** 1 đánh giá công khai trên trang sách */
export interface PublicReview {
  id: number;
  rating: number;
  content: string | null;
  /** Họ tên đầy đủ người viết (Q6) */
  authorName: string;
  isEdited: boolean;
  createdAt: Date;
}

export interface ReviewSummary {
  /** Làm tròn 1 chữ số; chưa có đánh giá = 0 */
  average: number;
  count: number;
  /** Số lượt theo từng mức sao 1–5 */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

/** Đánh giá của chính khách hàng */
export interface MyReview {
  id: number;
  orderId: number;
  bookId: number;
  rating: number;
  content: string | null;
  isHidden: boolean;
  isEdited: boolean;
  /** Còn sửa được (chưa ẩn, trong REVIEW_EDIT_DAYS ngày) */
  canEdit: boolean;
  createdAt: Date;
}

export interface ReviewStatus {
  /** Đơn Đã giao có sách này mà chưa đánh giá */
  reviewableOrders: { orderId: number; code: string; deliveredAt: Date | null }[];
  myReviews: MyReview[];
}

/** 1 dòng danh sách Admin */
export interface AdminReviewRow {
  id: number;
  rating: number;
  content: string | null;
  isHidden: boolean;
  hiddenReason: string | null;
  hiddenAt: Date | null;
  isEdited: boolean;
  createdAt: Date;
  book: { id: number; title: string };
  customer: { id: number; fullName: string; email: string };
  order: { id: number; code: string };
}
