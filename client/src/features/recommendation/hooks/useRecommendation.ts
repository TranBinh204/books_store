'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth';
import { catalogApi } from '@/features/catalog';
import * as recommendationApi from '../api/recommendation.api';

export const PREFERENCES_PATH = '/tai-khoan/so-thich';
export const RECOMMENDATIONS_PATH = '/goi-y-sach';

export const recommendationKeys = {
  /** Theo từng tài khoản — đổi tài khoản không lẫn dữ liệu */
  preferences: (userId: number) => ['me', 'preferences', userId] as const,
  recommendations: (userId: number) => ['me', 'recommendations', userId] as const,
};

/** Đang đăng nhập bằng tài khoản khách hàng (Admin không dùng gợi ý) */
export function useCustomerId(): number | null {
  const { data: user } = useCurrentUser();
  return user?.role === 'CUSTOMER' ? user.id : null;
}

export function usePreferences() {
  const userId = useCustomerId();
  return useQuery({
    queryKey: recommendationKeys.preferences(userId ?? 0),
    queryFn: recommendationApi.getPreferences,
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

/** Lưu / bỏ qua sở thích → cập nhật sở thích, gợi ý cũ không còn đúng */
function usePreferenceMutation<T>(
  mutationFn: (input: T) => ReturnType<typeof recommendationApi.getPreferences>,
) {
  const userId = useCustomerId() ?? 0;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (preferences) => {
      queryClient.setQueryData(recommendationKeys.preferences(userId), preferences);
      queryClient.invalidateQueries({ queryKey: recommendationKeys.recommendations(userId) });
    },
  });
}

export function useSavePreferences() {
  return usePreferenceMutation(recommendationApi.savePreferences);
}

export function useSkipPreferences() {
  return usePreferenceMutation<void>(() => recommendationApi.skipPreferences());
}

/** Gợi ý sách — chỉ gọi khi `enabled` (mỗi lần gọi có thể tốn lượt AI) */
export function useRecommendations(enabled = true) {
  const userId = useCustomerId();
  return useQuery({
    queryKey: recommendationKeys.recommendations(userId ?? 0),
    queryFn: recommendationApi.getRecommendations,
    enabled: enabled && userId !== null,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

/** Lấy gợi ý khi cần (nút "Gợi ý sách cho tôi" trong chatbox M16) — dùng chung cache với khối trang chủ */
export function useFetchRecommendations() {
  const userId = useCustomerId() ?? 0;
  const queryClient = useQueryClient();
  return () =>
    queryClient.fetchQuery({
      queryKey: recommendationKeys.recommendations(userId),
      queryFn: recommendationApi.getRecommendations,
      staleTime: 10 * 60 * 1000,
    });
}

/** "Gợi ý lại" — bỏ qua kết quả đã lưu, hỏi AI lần nữa */
export function useRefreshRecommendations() {
  const userId = useCustomerId() ?? 0;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recommendationApi.refreshRecommendations,
    onSuccess: (result) =>
      queryClient.setQueryData(recommendationKeys.recommendations(userId), result),
  });
}

/** Cây danh mục cho phần chọn thể loại */
export function useCategoryOptions() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: catalogApi.getCategoryTree,
    staleTime: 10 * 60 * 1000,
  });
}
