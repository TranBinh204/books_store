import type { Ref } from 'react';
import { BookCard } from '@/components/shop/BookCard';
import { BookCardSkeleton } from '@/components/shop/BookCardSkeleton';
import type { BookCardItem } from '../types/catalog.types';
import styles from './Listing.module.css';

/**
 * Lưới sách của trang danh mục / tìm kiếm: 4 cột (có cột lọc) hoặc 5 cột (không có),
 * ≤ 900px còn 3 cột, ≤ 640px còn 2 cột. Mỗi thẻ hiện dần khi cuộn tới (`data-reveal`).
 */
export function BookGrid({
  books,
  loadingCount = 0,
  wide = false,
  ref,
}: {
  books: BookCardItem[];
  /** Số thẻ skeleton nối cuối lưới (đang tải thêm) */
  loadingCount?: number;
  /** 5 cột thay cho 4 (trang không có cột lọc) */
  wide?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className={`${styles.grid} ${wide ? styles.grid5 : ''}`}>
      {books.map((book) => (
        <div key={book.id} className={styles.cell} data-reveal="">
          <BookCard book={book} />
        </div>
      ))}
      {Array.from({ length: loadingCount }, (_, index) => (
        <BookCardSkeleton key={`skeleton-${index}`} />
      ))}
    </div>
  );
}
