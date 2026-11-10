'use client';

import Link from 'next/link';
import { BookCover } from '@/components/shop/BookCover';
import { AddToCartButton } from '@/features/cart/components/AddToCartButton';
import type { BookCardItem } from '@/features/catalog';
import { isFlashSaleAvailable } from '@/features/flash-sale/types';
import { formatPrice } from '@/lib/format';
import styles from './Chat.module.css';

/**
 * Thẻ sách thu gọn trong khung chat (M16 Q6, demo 07 .cb): BẤM VÀO THẺ (bất kỳ đâu) → mở trang sản phẩm.
 * Link phủ cả thẻ; nút thoi thêm giỏ nằm trên link nên bấm nút chỉ thêm vào giỏ (sách bay vào giỏ).
 */
export function ChatBookCard({
  book,
  reason,
  onNavigate,
}: {
  book: BookCardItem;
  /** Lý do gợi ý (từ M15) */
  reason?: string | null;
  /** Bấm vào thẻ (mobile: thu nhỏ khung chat để thấy trang sách) */
  onNavigate?: () => void;
}) {
  const outOfStock = book.stockStatus === 'OUT_OF_STOCK';
  const flash = isFlashSaleAvailable(book.flashSale) ? book.flashSale : null;
  const price = flash?.salePrice ?? book.price;
  const authors = book.authors.map((author) => author.name).join(', ');

  return (
    <div className={styles.cb} data-book={book.id}>
      <span className={styles.cbCover} data-cover>
        <BookCover
          url={book.coverUrl}
          alt={book.title}
          sizes="32px"
          seed={book.id}
          author={authors}
        />
      </span>
      <div>
        <Link href={`/sach/${book.id}`} onClick={onNavigate} className={styles.cbLink}>
          <b>{book.title}</b>
        </Link>
        <small>
          {outOfStock ? 'Đã hết hàng' : formatPrice(price)}
          {!outOfStock && book.originalPrice > price && <s>{formatPrice(book.originalPrice)}</s>}
          {flash && ' · Flash Sale'}
        </small>
      </div>
      <AddToCartButton
        bookId={book.id}
        title={book.title}
        disabled={outOfStock}
        className={styles.cbAdd}
      />
      {reason && (
        <p className={styles.reason}>
          <em>Vì sao: </em>
          {reason}
        </p>
      )}
    </div>
  );
}
