'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/features/auth';
import * as reviewApi from '../api/review.api';
import type { ReviewFilter } from '../types';

/** Số đánh giá mỗi trang ở trang sách */
export const REVIEWS_PAGE_SIZE = 10;

export const reviewKeys = {
  book: (bookId: number) => ['reviews', bookId] as const,
  summary: (bookId: number) => ['reviews', bookId, 'summary'] as const,
  list: (bookId: number, filter: ReviewFilter, page: number) =>
    ['reviews', bookId, 'list', filter, page] as const,
  mine: ['me', 'reviews'] as const,
  status: (bookId: number) => ['me', 'reviews', 'book', bookId] as const,
  order: (orderId: number) => ['me', 'reviews', 'order', orderId] as const,
};

export function useReviewSummary(bookId: number) {
  return useQuery({
    queryKey: reviewKeys.summary(bookId),
    queryFn: () => reviewApi.getSummary(bookId),
  });
}

export function useReviews(bookId: number, filter: ReviewFilter, page: number) {
  return useQuery({
    queryKey: reviewKeys.list(bookId, filter, page),
    queryFn: () => reviewApi.listReviews(bookId, { ...filter, page, limit: REVIEWS_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

/** Đơn còn được viết + đánh giá của tôi cho 1 sách — chỉ khách hàng đã đăng nhập */
export function useReviewStatus(bookId: number) {
  const { data: user } = useCurrentUser();
  return useQuery({
    queryKey: reviewKeys.status(bookId),
    queryFn: () => reviewApi.getReviewStatus(bookId),
    enabled: user?.role === 'CUSTOMER',
  });
}

export function useOrderReviews(orderId: number, enabled: boolean) {
  return useQuery({
    queryKey: reviewKeys.order(orderId),
    queryFn: () => reviewApi.listOrderReviews(orderId),
    enabled,
  });
}

/**
 * Viết mới (`reviewId` không có) hoặc sửa → làm mới đánh giá của sách, của tôi,
 * và điểm sách render ở server (sao dưới tên sách).
 */
export function useSaveReview(bookId: number) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({
      reviewId,
      orderId,
      payload,
    }: {
      reviewId?: number;
      orderId: number;
      payload: reviewApi.ReviewPayload;
    }) =>
      reviewId
        ? reviewApi.updateReview(reviewId, payload)
        : reviewApi.createReview({ ...payload, orderId, bookId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.book(bookId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.mine });
      router.refresh();
    },
  });
}
