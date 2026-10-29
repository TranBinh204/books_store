import { http } from '@/lib/http';
import type { MyReview, PublicReview, ReviewFilter, ReviewStatus, ReviewSummary } from '../types';

export async function getSummary(bookId: number) {
  return (await http.get<ReviewSummary>(`/books/${bookId}/reviews/summary`)).data;
}

export async function listReviews(
  bookId: number,
  params: ReviewFilter & { page: number; limit: number },
) {
  const { data, meta } = await http.get<PublicReview[]>(`/books/${bookId}/reviews`, {
    query: {
      rating: params.rating,
      withContent: params.withContent ? 'true' : undefined,
      page: params.page,
      limit: params.limit,
    },
  });
  return { items: data, meta };
}

export async function getReviewStatus(bookId: number) {
  return (await http.get<ReviewStatus>(`/me/books/${bookId}/review-status`)).data;
}

export async function listOrderReviews(orderId: number) {
  return (await http.get<MyReview[]>(`/me/orders/${orderId}/reviews`)).data;
}

export interface ReviewPayload {
  rating: number;
  content: string | null;
}

export async function createReview(payload: ReviewPayload & { orderId: number; bookId: number }) {
  return (await http.post<MyReview>('/me/reviews', payload)).data;
}

export async function updateReview(id: number, payload: ReviewPayload) {
  return (await http.patch<MyReview>(`/me/reviews/${id}`, payload)).data;
}
