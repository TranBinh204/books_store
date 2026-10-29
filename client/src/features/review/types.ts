// Đánh giá sách (M10) — khớp server/src/types/review.types.ts

export interface PublicReview {
  id: number;
  rating: number;
  content: string | null;
  authorName: string;
  isEdited: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface MyReview {
  id: number;
  orderId: number;
  bookId: number;
  rating: number;
  content: string | null;
  isHidden: boolean;
  isEdited: boolean;
  canEdit: boolean;
  createdAt: string;
}

export interface ReviewStatus {
  reviewableOrders: { orderId: number; code: string; deliveredAt: string | null }[];
  myReviews: MyReview[];
}

/** Bộ lọc danh sách công khai */
export interface ReviewFilter {
  rating?: number;
  withContent?: boolean;
}

/** Sách đang được đánh giá (hiện trong hộp thoại) */
export interface ReviewBook {
  id: number;
  title: string;
  image: string | null;
}
