import Link from 'next/link';
import type { ReactNode } from 'react';
import { AddToCartButton } from '@/features/cart/components/AddToCartButton';
import { SoldProgress } from '@/features/flash-sale/components/SoldProgress';
import { isFlashSaleAvailable, type BookFlashSale } from '@/features/flash-sale/types';
import { WishlistButton } from '@/features/wishlist/components/WishlistButton';
import { formatCompact } from '@/lib/format';
import type { IdName } from '@/features/catalog/types/catalog.types';
import styles from './BookCard.module.css';
import { BookCover } from './BookCover';
import { PriceTag } from './PriceTag';
import { Seal } from './Seal';

/** Dữ liệu tối thiểu để vẽ thẻ sách (khớp BookCardItem của features/catalog) */
export interface BookCardData {
  id: number;
  title: string;
  coverUrl: string | null;
  price: number;
  originalPrice: number;
  discountPercent: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  /** Flash sale đang chạy (M12) — còn suất thì hiện giá sale */
  flashSale?: BookFlashSale | null;
  authors?: IdName[];
  soldCount?: number;
  /** Điểm sao + số đánh giá (API danh sách — A1) */
  ratingAvg?: number | null;
  ratingCount?: number;
  /** Sách mới (A1) → tem "Mới" */
  isNew?: boolean;
}

/** Ảnh bìa thẻ: ~230px trên desktop, 1/4 màn hình tablet, 64% mobile (slider) */
const CARD_IMAGE_SIZES = '(min-width: 1180px) 230px, (min-width: 640px) 25vw, 64vw';

/** "★ 4.8 · 1,2k lời phán · 3k đã bán" — thiếu phần nào thì bỏ phần đó */
function metaLine(book: BookCardData): ReactNode {
  const parts: ReactNode[] = [];
  if (book.ratingCount && book.ratingAvg) {
    parts.push(
      <b key="r">★ {book.ratingAvg.toFixed(1)}</b>,
      ` · ${formatCompact(book.ratingCount)} lời phán`,
    );
  }
  if (book.soldCount)
    parts.push(`${parts.length ? ' · ' : ''}${formatCompact(book.soldCount)} đã bán`);
  return parts.length ? parts : 'Chưa có lời phán nào';
}

/**
 * Thẻ sách dùng ở mọi danh sách — demo 07 (components.md 2.3):
 * khung vàng 2 góc · bìa 2/3 nghiêng 3D theo chuột · tem tròn · tim · tác giả · tên · meta · giá · nút thoi thêm giỏ.
 * `variant="curse"`: khối Flash Sale (nền đỏ sẫm, giá cam). `showFlashProgress`: thêm thanh "Đã bán x/y".
 */
export function BookCard({
  book,
  variant = 'default',
  showFlashProgress = false,
}: {
  book: BookCardData;
  variant?: 'default' | 'curse';
  showFlashProgress?: boolean;
}) {
  const href = `/sach/${book.id}`;
  const outOfStock = book.stockStatus === 'OUT_OF_STOCK';
  const flash = book.flashSale;
  const activeFlash = isFlashSaleAvailable(flash) ? flash : null;
  const flashSoldOut = showFlashProgress && !!flash && !activeFlash;
  const authorNames = book.authors?.map((a) => a.name).join(', ');
  const curse = variant === 'curse';

  return (
    <article
      className={`surface corners ${styles.card} ${curse ? styles.curse : ''} ${outOfStock || flashSoldOut ? styles.dim : ''}`}
      data-book={book.id}
    >
      <div className={styles.cover3d}>
        <div className={styles.cover} data-cover data-tilt="12">
          <Link href={href} className={styles.coverLink} tabIndex={-1} aria-hidden="true">
            <BookCover
              url={book.coverUrl}
              alt={book.title}
              sizes={CARD_IMAGE_SIZES}
              seed={book.id}
              author={authorNames}
            />
          </Link>
          <Seal
            flashPercent={activeFlash?.discountPercent}
            isNew={book.isNew}
            discountPercent={book.discountPercent}
            outOfStock={outOfStock}
          />
          <WishlistButton bookId={book.id} />
        </div>
      </div>

      {authorNames && <p className={styles.author}>{authorNames}</p>}
      <h3 className={styles.title}>
        <Link href={href} title={book.title}>
          {book.title}
        </Link>
      </h3>
      <p className={styles.meta}>{metaLine(book)}</p>

      {showFlashProgress && flash && <SoldProgress sold={flash.sold} quantity={flash.quantity} />}

      <div className={styles.foot}>
        <PriceTag
          price={activeFlash?.salePrice ?? book.price}
          originalPrice={book.originalPrice}
          variant={curse ? 'curse' : 'card'}
        />
        <AddToCartButton
          bookId={book.id}
          title={book.title}
          disabled={outOfStock || flashSoldOut}
        />
      </div>
    </article>
  );
}
