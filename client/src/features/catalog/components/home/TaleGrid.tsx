import Link from 'next/link';
import { BookCover } from '@/components/shop/BookCover';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { formatStars } from '@/lib/format';
import type { HomeReview } from '../../types/home.types';
import styles from './TaleGrid.module.css';

/** Chương IX · "Những lời kể từ lữ khách" (A6, trang chủ khối 13): 3 đánh giá hay gần đây */
export function TaleGrid({ reviews }: { reviews: HomeReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section className="sec">
      <div className="wrap">
        <SectionTitle
          chapter="Chương IX · Độc giả"
          title={
            <>
              Những <em>lời kể</em> từ lữ khách
            </>
          }
        />
        <div className={styles.tales} data-stagger="">
          {reviews.map((review) => (
            <figure key={`${review.book.id}-${review.userName}`} className={styles.tale}>
              <span className={styles.st} aria-label={`${review.rating} sao`}>
                {formatStars(review.rating)}
              </span>
              <blockquote>
                <p>“{review.content}”</p>
              </blockquote>
              <figcaption className={styles.who}>
                <Link href={`/sach/${review.book.id}`} className={styles.cv} tabIndex={-1}>
                  <BookCover
                    url={review.book.coverUrl}
                    alt={review.book.title}
                    sizes="34px"
                    seed={review.book.id}
                  />
                </Link>
                <span>
                  <b>{review.userName}</b>
                  {review.province && ` · ${review.province}`}
                  <br />
                  <Link href={`/sach/${review.book.id}`}>
                    <i>{review.book.title}</i>
                  </Link>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
