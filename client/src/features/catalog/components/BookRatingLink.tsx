'use client';

import { RatingStars } from '@/features/review';
import styles from './BookDetail.module.css';
import { OPEN_REVIEWS_EVENT, REVIEWS_ANCHOR } from './BookTabs';

/** "★★★★☆ 4.5 (12 đánh giá)" dưới tên sách — bấm → mở tab Đánh giá & cuộn tới (M10 mục 4.1) */
export function BookRatingLink({ average, count }: { average: number; count: number }) {
  const openReviews = () => {
    window.dispatchEvent(new Event(OPEN_REVIEWS_EVENT));
    document.getElementById(REVIEWS_ANCHOR)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <button type="button" onClick={openReviews} className={styles.rating}>
      <RatingStars value={count > 0 ? average : 0} />
      {count > 0 ? (
        <>
          <b>{average.toFixed(1)}</b>
          <span>({count} đánh giá)</span>
        </>
      ) : (
        <span>Chưa có đánh giá</span>
      )}
    </button>
  );
}
