import Link from 'next/link';
import { Silhouette } from '@/components/fx/Silhouette';
import { BookCover } from '@/components/shop/BookCover';
import { Parchment } from '@/components/shop/Parchment';
import { PriceTag } from '@/components/shop/PriceTag';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { AddToCartButton } from '@/features/cart/components/AddToCartButton';
import { isFlashSaleAvailable } from '@/features/flash-sale/types';
import { formatStars } from '@/lib/format';
import type { HomeFeaturedBook } from '../../types/home.types';
import styles from './LegendList.module.css';

/**
 * Chương III · "Truyền thuyết nổi bật" (A3, trang chủ khối 5): 4 sách trên giấy da lớn, xếp so le
 * trái / phải — số 01–04, bìa, tên, tác giả, tóm tắt, giá, sao, nút "Thêm vào giỏ".
 */
export function LegendList({ books }: { books: HomeFeaturedBook[] }) {
  if (books.length === 0) return null;
  return (
    <section className="sec" id="legends" data-pausable>
      <Silhouette
        shape="bats"
        hideOnMobile
        style={{ right: '3%', top: 70, width: 240, color: 'var(--color-moss)' }}
      />
      <div className="wrap">
        <SectionTitle
          chapter="Chương III · Tuyển chọn"
          title={
            <>
              Truyền thuyết <em>nổi bật</em>
            </>
          }
          subtitle="Những câu chuyện được lữ khách săn lùng nhiều nhất mùa này"
        />
        <Parchment contentClassName={styles.content} data-reveal="">
          {books.map((book, i) => {
            const flash = isFlashSaleAvailable(book.flashSale) ? book.flashSale : null;
            const outOfStock = book.stockStatus === 'OUT_OF_STOCK';
            const authors = book.authors.map((a) => a.name).join(', ');
            return (
              <article
                key={book.id}
                className={`${styles.legend} ${i % 2 ? styles.rev : ''}`}
                data-book={book.id}
              >
                <Link href={`/sach/${book.id}`} className={styles.cv} data-cover>
                  <BookCover
                    url={book.coverUrl}
                    alt={book.title}
                    sizes="230px"
                    seed={book.id}
                    author={authors}
                  />
                </Link>
                <div>
                  <div className={styles.num}>{String(i + 1).padStart(2, '0')}</div>
                  <h3>
                    <Link href={`/sach/${book.id}`}>{book.title}</Link>
                  </h3>
                  {authors && <div className={styles.by}>{authors}</div>}
                  {book.excerpt && <p>{book.excerpt}</p>}
                  <div className={styles.meta}>
                    <PriceTag
                      price={flash?.salePrice ?? book.price}
                      originalPrice={book.originalPrice}
                      variant="parchment"
                    />
                    {book.ratingCount > 0 && (
                      <span className={styles.stars}>
                        {formatStars(book.ratingAvg)} {book.ratingAvg.toFixed(1)}
                      </span>
                    )}
                    <AddToCartButton
                      bookId={book.id}
                      title={book.title}
                      variant="ink"
                      disabled={outOfStock}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </Parchment>
      </div>
    </section>
  );
}
