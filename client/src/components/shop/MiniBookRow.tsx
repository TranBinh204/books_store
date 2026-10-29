import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatPrice } from '@/lib/format';
import { BookCover } from './BookCover';
import styles from './MiniBookRow.module.css';

/**
 * Dòng sách nhỏ: bìa · tên + dòng phụ · giá (components.md 2.12).
 * Dùng cho bảng xếp hạng, chat, đánh giá… Bìa xoay nhẹ khi rê chuột.
 * `compact`: bìa 32px (chat). `before`: nội dung đầu dòng (vd. số hạng).
 */
export function MiniBookRow({
  book,
  subtitle,
  compact = false,
  before,
  className = '',
}: {
  book: { id: number; title: string; coverUrl: string | null; price?: number };
  subtitle?: ReactNode;
  compact?: boolean;
  before?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={`/sach/${book.id}`}
      className={`${styles.row} ${compact ? styles.compact : ''} ${className}`}
      data-book={book.id}
    >
      {before}
      <span className={styles.cv} data-cover>
        <BookCover url={book.coverUrl} alt={book.title} sizes="48px" seed={book.id} />
      </span>
      <span>
        <b>{book.title}</b>
        {subtitle && <small>{subtitle}</small>}
      </span>
      {book.price !== undefined && <span className={styles.price}>{formatPrice(book.price)}</span>}
    </Link>
  );
}
