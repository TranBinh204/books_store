import { http } from '@/lib/http';

// Admin – Đánh giá (M10) — khớp server/src/types/review.types.ts (AdminReviewRow)

export interface AdminReviewRow {
  id: number;
  rating: number;
  content: string | null;
  isHidden: boolean;
  hiddenReason: string | null;
  hiddenAt: string | null;
  isEdited: boolean;
  createdAt: string;
  book: { id: number; title: string };
  customer: { id: number; fullName: string; email: string };
  order: { id: number; code: string };
}

export interface AdminReviewParams {
  q?: string;
  rating?: number;
  status?: 'visible' | 'hidden';
  from?: string;
  to?: string;
  sort: 'newest' | 'rating_asc';
  page: number;
  limit: number;
}

export async function listReviews(params: AdminReviewParams) {
  const { data, meta } = await http.get<AdminReviewRow[]>('/admin/reviews', {
    query: { ...params },
  });
  return { items: data, meta };
}

export async function hideReview(id: number, reason: string) {
  await http.post(`/admin/reviews/${id}/hide`, { reason });
}

export async function unhideReview(id: number) {
  await http.post(`/admin/reviews/${id}/unhide`);
}
