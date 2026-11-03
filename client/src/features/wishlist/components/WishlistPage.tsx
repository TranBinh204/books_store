'use client';

import { useState } from 'react';
import { BookCard } from '@/components/shop/BookCard';
import { BookCardSkeleton } from '@/components/shop/BookCardSkeleton';
import { BookCover } from '@/components/shop/BookCover';
import { ListingEmpty } from '@/components/shop/ListingEmpty';
import { IconTrash } from '@/components/ui/icons';
import { Pager } from '@/components/ui/Pager';
import { AccountPanel } from '@/features/profile';
import { errorMessage } from '@/lib/form';
import { useToggleWishlist, useWishlist } from '../hooks/useWishlist';
import type { WishlistItem } from '../types';
import styles from './WishlistPage.module.css';

/** Sách đã bị ẩn / ngừng bán sau khi lưu — mờ, chỉ còn nút Xoá (M09 quy tắc 5) */
function UnavailableCard({ book }: { book: WishlistItem }) {
  const { toggle } = useToggleWishlist();
  return (
    <article className={`surface ${styles.gone}`}>
      <div className={styles.cover}>
        <BookCover url={book.coverUrl} alt={book.title} sizes="260px" seed={book.id} />
      </div>
      <p className={styles.title}>{book.title}</p>
      <span className={styles.tag}>✦ Ngừng kinh doanh</span>
      <button type="button" onClick={() => toggle(book.id)} className={styles.remove}>
        <IconTrash width="18" height="18" />
        Xoá
      </button>
    </article>
  );
}

/** Trang /tai-khoan/yeu-thich (M09 mục 4.3) */
export function WishlistPage() {
  const [page, setPage] = useState(1);
  const wishlist = useWishlist(page);
  const total = wishlist.data?.meta?.total ?? 0;
  const totalPages = wishlist.data?.meta?.totalPages ?? 1;

  // Bỏ hết sách ở trang cuối → lùi về trang cuối mới (điều chỉnh state ngay khi render)
  if (wishlist.data && !wishlist.isPlaceholderData && page > totalPages) setPage(totalPages);

  return (
    <AccountPanel
      chapter="Thư khố"
      title={
        <>
          Sách <em>yêu thích</em>
          {total ? ` (${total})` : ''}
        </>
      }
      description="Những cuốn sách bạn đã lưu để xem và mua sau"
    >
      {wishlist.isPending ? (
        <div className={styles.grid} aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <BookCardSkeleton key={index} />
          ))}
        </div>
      ) : wishlist.isError ? (
        <div className={styles.failBox}>
          <p className={styles.fail} role="alert">
            {errorMessage(wishlist.error)}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => wishlist.refetch()}>
            <span>Thử lại</span>
          </button>
        </div>
      ) : wishlist.data.items.length === 0 && total === 0 ? (
        <ListingEmpty
          message="Bạn chưa có sách yêu thích nào. Bấm ♡ ở sách bạn thích để lưu lại xem sau"
          action={{ href: '/', label: 'Khám phá sách', variant: 'gold' }}
        />
      ) : (
        <>
          <ul className={`${styles.grid} ${wishlist.isPlaceholderData ? styles.stale : ''}`}>
            {wishlist.data.items.map((book) => (
              <li key={book.id}>
                {book.isAvailable ? <BookCard book={book} /> : <UnavailableCard book={book} />}
              </li>
            ))}
          </ul>
          <Pager page={Math.min(page, totalPages)} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </AccountPanel>
  );
}
