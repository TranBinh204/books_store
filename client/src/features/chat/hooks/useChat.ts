'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth';
import * as chatApi from '../api/chat.api';
import type { ChatHistory } from '../types';

export const chatKeys = {
  /** Theo từng tài khoản — đổi tài khoản không lẫn cuộc trò chuyện */
  history: (userId: number) => ['me', 'chat', userId] as const,
};

type HistoryData = InfiniteData<ChatHistory, number | undefined>;

/** Chatbox chỉ cho khách hàng (Q1 — Admin không có) */
export function useChatUser() {
  const { data: user, isPending } = useCurrentUser();
  return {
    user: user?.role === 'CUSTOMER' ? user : null,
    isAdmin: user?.role === 'ADMIN',
    isPending,
  };
}

/** Lịch sử chat: trang đầu = tin mới nhất, `fetchNextPage` = tin cũ hơn. Tải khi mở khung chat */
export function useChatHistory(enabled: boolean) {
  const { user } = useChatUser();
  return useInfiniteQuery({
    queryKey: chatKeys.history(user?.id ?? 0),
    queryFn: ({ pageParam }) => chatApi.getHistory(pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? (last.messages[0]?.id ?? undefined) : undefined),
    enabled: enabled && !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/** Gửi tin — AI trả lời được thì nối câu hỏi + câu trả lời vào trang mới nhất (khỏi tải lại) */
export function useSendChatMessage() {
  const { user } = useChatUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatApi.sendMessage,
    onSuccess: (result) => {
      if (result.source !== 'ai' || !result.question) return;
      const added = [result.question, result.answer];
      queryClient.setQueryData<HistoryData>(chatKeys.history(user?.id ?? 0), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page, index) =>
                index === 0 ? { ...page, messages: [...page.messages, ...added] } : page,
              ),
            }
          : data,
      );
    },
  });
}

/** Xoá cuộc trò chuyện → về trang rỗng (giữ câu hỏi có sẵn) */
export function useClearChat() {
  const { user } = useChatUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatApi.clearHistory,
    onSuccess: () =>
      queryClient.setQueryData<HistoryData>(chatKeys.history(user?.id ?? 0), (data) =>
        data
          ? {
              pages: [{ ...data.pages[0], messages: [], hasMore: false }],
              pageParams: [undefined],
            }
          : data,
      ),
  });
}
