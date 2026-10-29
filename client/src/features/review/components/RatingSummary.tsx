import type { ReviewSummary } from '../types';
import { RatingStars } from './RatingStars';
import styles from './Review.module.css';

/** Điểm lớn + 5 thanh phân bố sao (bấm thanh = lọc theo số sao) — M10 mục 4.1 */
export function RatingSummary({
  summary,
  activeRating,
  onSelectRating,
}: {
  summary: ReviewSummary;
  activeRating?: number;
  onSelectRating: (rating: number | undefined) => void;
}) {
  return (
    <div className={styles.summary}>
      <div className={styles.score}>
        <div>
          <b>{summary.average.toFixed(1)}</b>
          <small>/5</small>
        </div>
        <RatingStars value={summary.average} size={22} />
        <span>{summary.count} đánh giá</span>
      </div>

      <ul className={styles.bars}>
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const count = summary.distribution[star];
          const percent = summary.count ? Math.round((count / summary.count) * 100) : 0;
          return (
            <li key={star}>
              <button
                type="button"
                onClick={() => onSelectRating(activeRating === star ? undefined : star)}
                disabled={count === 0}
                aria-pressed={activeRating === star}
              >
                <span>{star} sao</span>
                <span className={styles.track}>
                  <i style={{ width: `${percent}%` }} />
                </span>
                <span>
                  {percent}% ({count})
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
