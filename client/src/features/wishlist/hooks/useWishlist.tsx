'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useCurrentUser } from '@/features/auth';
import { errorMessage } from '@/lib/form';
import * as wishlistApi from '../api/wishlist.api';

export const WISHLIST_PATH = '/tai-khoan/yeu-thich';
/** Số sách mỗi trang ở Sách yêu thích */
export const WISHLIST_PAGE_SIZE = 20;

export const wishlistKeys = {
  all: ['me', 'wishlist'] as const,
  /** Theo từng tài khoản — đổi tài khoản không lẫn ♥ */
  ids: (userId: number) => ['me', 'wishlist', 'ids', userId] as const,
  list: (page: number) => ['me', 'wishlist', 'list', page] as const,
};

/** Id các sách đã thích của khách hàng đang đăng nhập (khách vãng lai / Admin → rỗng) */
export function useWishlistIds(): number[] {
  const { data: user } = useCurrentUser();
  const enabled = user?.role === 'CUSTOMER';
  const query = useQuery({
    queryKey: wishlistKeys.ids(user?.id ?? 0),
    queryFn: wishlistApi.getWishlistIds,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
  return enabled ? (query.data ?? []) : [];
}

export function useWishlist(page: number) {
  return useQuery({
    queryKey: wishlistKeys.list(page),
    queryFn: () => wishlistApi.listWishlist({ page, limit: WISHLIST_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Bật / tắt ♡ (M09 quy tắc 1–3): đổi ngay (optimistic), lỗi thì trả lại.
 * Khách vãng lai → mời đăng nhập rồi quay lại trang sách (Q1, Q2). Admin → báo không dùng được.
 */
export function useToggleWishlist() {
  const { data: user, isPending: userPending } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const likedIds = useWishlistIds();
  const idsKey = wishlistKeys.ids(user?.id ?? 0);

  const mutation = useMutation({
    mutationFn: async ({ bookId, add }: { bookId: number; add: boolean }) => {
      if (add) await wishlistApi.addToWishlist(bookId);
      else await wishlistApi.removeFromWishlist(bookId);
    },
    onMutate: async ({ bookId, add }) => {
      await queryClient.cancelQueries({ queryKey: idsKey });
      const previous = queryClient.getQueryData<number[]>(idsKey) ?? [];
      const others = previous.filter((id) => id !== bookId);
      queryClient.setQueryData(idsKey, add ? [bookId, ...others] : others);
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(idsKey, context?.previous);
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: wishlistKeys.all }),
  });

  const isLiked = (bookId: number) => likedIds.includes(bookId);

  const toggle = (bookId: number) => {
    if (userPending) return;
    if (!user) {
      enqueueSnackbar('Đăng nhập để lưu sách yêu thích', {
        variant: 'info',
        action: () => (
          <button
            type="button"
            className="more"
            onClick={() => router.push(`/dang-nhap?next=${encodeURIComponent(`/sach/${bookId}`)}`)}
          >
            Đăng nhập
          </button>
        ),
      });
      return;
    }
    if (user.role !== 'CUSTOMER') {
      enqueueSnackbar('Tài khoản quản trị không thể dùng chức năng này', { variant: 'warning' });
      return;
    }

    const add = !isLiked(bookId);
    mutation.mutate(
      { bookId, add },
      {
        onSuccess: () =>
          enqueueSnackbar(add ? 'Đã thêm vào Sách yêu thích' : 'Đã bỏ khỏi Sách yêu thích', {
            variant: 'success',
            action: () =>
              add ? (
                <Link className="more" href={WISHLIST_PATH}>
                  Xem
                </Link>
              ) : (
                <button
                  type="button"
                  className="more"
                  onClick={() => mutation.mutate({ bookId, add: true })}
                >
                  Hoàn tác
                </button>
              ),
          }),
      },
    );
  };

  return { toggle, isLiked };
}
