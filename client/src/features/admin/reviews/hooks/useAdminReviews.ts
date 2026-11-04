'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as reviewApi from '../api/admin-review.api';

export const adminReviewsKey = ['admin', 'reviews'] as const;

export function useAdminReviews(params: reviewApi.AdminReviewParams) {
  return useQuery({
    queryKey: [...adminReviewsKey, params],
    queryFn: () => reviewApi.listReviews(params),
    placeholderData: keepPreviousData,
  });
}

/** Ẩn (`reason`) / hiện lại (`reason = null`) */
export function useSetReviewHidden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string | null }) =>
      reason === null ? reviewApi.unhideReview(id) : reviewApi.hideReview(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminReviewsKey });
      // Điểm & danh sách đánh giá công khai của sách
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}
