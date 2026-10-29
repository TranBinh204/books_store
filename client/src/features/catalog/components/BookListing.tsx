'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useRef, type ReactNode } from 'react';
import { errorMessage } from '@/lib/form';
import { listBooks } from '../api/catalog.api';
import { LISTING_PAGE_SIZE } from '../listing';
import type { BookCardItem, BookListParams } from '../types/catalog.types';
import { BookGrid } from './BookGrid';
import styles from './Listing.module.css';

export interface BookPage {
  items: BookCardItem[];
  total: number;
  totalPages: number;
}

interface BookListingProps {
  /** Bộ lọc hiện tại (không gồm page / limit) */
  params: BookListParams;
  /** Trang 1 — lấy sẵn ở Server Component (SEO) */
  firstPage: BookPage;
  /** Hiện khi không có sách nào */
  empty: ReactNode;
  /** Đang đổi bộ lọc (chờ trang mới từ server) → làm mờ lưới */
  pending?: boolean;
  /** 5 cột thay cho 4 */
  wide?: boolean;
  /** Câu khép lại khi đã xem hết (chỉ hiện nếu có nhiều hơn 1 trang) */
  endText: string;
  /** Thanh công cụ vẽ phía trên lưới; nhận số sách đang hiện + tổng */
  toolbar?: (info: { shown: number; total: number }) => ReactNode;
}

/**
 * Lưới sách + nút "Xem thêm sản phẩm" (mỗi lần thêm LISTING_PAGE_SIZE sách).
 * Đổi bộ lọc → component được tạo lại (key theo bộ lọc) với trang 1 mới từ server.
 */
export function BookListing({
  params,
  firstPage,
  empty,
  pending = false,
  wide = false,
  endText,
  toolbar,
}: BookListingProps) {
  const { enqueueSnackbar } = useSnackbar();
  const gridRef = useRef<HTMLDivElement>(null);

  const query = useInfiniteQuery({
    queryKey: ['catalog', 'listing', params],
    queryFn: ({ pageParam }) => listBooks({ ...params, page: pageParam, limit: LISTING_PAGE_SIZE }),
    initialPageParam: 1,
    initialData: { pages: [firstPage], pageParams: [1] },
    getNextPageParam: (lastPage, pages) =>
      pages.length < lastPage.totalPages ? pages.length + 1 : undefined,
  });

  const books = query.data.pages.flatMap((page) => page.items);
  const total = query.data.pages[0]?.total ?? firstPage.total;
  const remaining = Math.max(total - books.length, 0);
  const loadingMore = query.isFetchingNextPage;

  const loadMore = async () => {
    if (loadingMore) return;
    const before = books.length;
    const result = await query.fetchNextPage();
    // Lỗi: giữ nguyên sách đã có, báo bằng toast
    if (result.isError) {
      enqueueSnackbar(errorMessage(result.error), { variant: 'error' });
      return;
    }
    // Bàn phím: đưa focus tới thẻ đầu tiên của đợt vừa tải (không cuộn)
    requestAnimationFrame(() =>
      gridRef.current?.children[before]?.querySelector('a')?.focus({ preventScroll: true }),
    );
  };

  return (
    <div>
      {toolbar?.({ shown: books.length, total })}
      {books.length === 0 ? (
        empty
      ) : (
        <div className={pending ? styles.dim : undefined} aria-busy={pending || undefined}>
          <BookGrid
            ref={gridRef}
            books={books}
            wide={wide}
            loadingCount={loadingMore ? Math.min(5, LISTING_PAGE_SIZE) : 0}
          />
          {query.hasNextPage ? (
            <div className={styles.more}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={loadMore}
                aria-busy={loadingMore || undefined}
              >
                <span>Xem thêm sản phẩm</span>
              </button>
              <small>
                Còn <b>{remaining}</b> tác phẩm đang chờ
              </small>
            </div>
          ) : (
            total > LISTING_PAGE_SIZE && <p className={styles.end}>✦ {endText} ✦</p>
          )}
        </div>
      )}
    </div>
  );
}
