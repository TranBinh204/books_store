'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth';
import * as notificationApi from '../api/notification.api';

/** Hỏi lại số chưa đọc mỗi 60 giây (Q4 — không dùng WebSocket) */
const UNREAD_REFETCH_MS = 60 * 1000;
/** Số thông báo mỗi lượt ở trang Thông báo */
export const NOTIFICATION_PAGE_SIZE = 20;
/** Số thông báo trong hộp thả xuống của chuông */
export const NOTIFICATION_MENU_SIZE = 8;

export const NOTIFICATIONS_PATH = '/tai-khoan/thong-bao';

export const notificationKeys = {
  all: ['me', 'notifications'] as const,
  /** Theo từng tài khoản — đổi tài khoản không lẫn số chưa đọc */
  unread: (userId: number) => ['me', 'notifications', 'unread', userId] as const,
  menu: (userId: number) => ['me', 'notifications', 'menu', userId] as const,
  list: (userId: number, unreadOnly: boolean) =>
    ['me', 'notifications', 'list', userId, unreadOnly] as const,
};

/** Chỉ khách hàng có thông báo (M13 quy tắc 1) */
export function useNotificationUser() {
  const { data: user } = useCurrentUser();
  return user?.role === 'CUSTOMER' ? user : null;
}

export function useUnreadCount() {
  const user = useNotificationUser();
  const query = useQuery({
    queryKey: notificationKeys.unread(user?.id ?? 0),
    queryFn: notificationApi.getUnreadCount,
    enabled: !!user,
    refetchInterval: UNREAD_REFETCH_MS,
    refetchOnWindowFocus: true,
  });
  return user ? (query.data ?? 0) : 0;
}

/** Thông báo mới nhất cho hộp thả xuống — tải khi mở */
export function useMenuNotifications(open: boolean) {
  const user = useNotificationUser();
  return useQuery({
    queryKey: notificationKeys.menu(user?.id ?? 0),
    queryFn: async () =>
      (await notificationApi.listNotifications({ page: 1, limit: NOTIFICATION_MENU_SIZE })).items,
    enabled: !!user && open,
    staleTime: 0,
  });
}

/** Trang Thông báo: tải thêm từng lượt 20 */
export function useNotificationList(unreadOnly: boolean) {
  const user = useNotificationUser();
  return useInfiniteQuery({
    queryKey: notificationKeys.list(user?.id ?? 0, unreadOnly),
    queryFn: ({ pageParam }) =>
      notificationApi.listNotifications({
        unread: unreadOnly,
        page: pageParam,
        limit: NOTIFICATION_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta && last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: !!user,
  });
}

function useRefreshNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkRead() {
  const refresh = useRefreshNotifications();
  return useMutation({ mutationFn: notificationApi.markRead, onSuccess: refresh });
}

export function useMarkAllRead() {
  const refresh = useRefreshNotifications();
  return useMutation({ mutationFn: notificationApi.markAllRead, onSuccess: refresh });
}
