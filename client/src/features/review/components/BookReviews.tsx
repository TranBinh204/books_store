'use client';

import { Pagination } from '@mui/material';
import { useState } from 'react';
import { formatDateTime } from '@/lib/format';
import { useReviews, useReviewStatus, useReviewSummary } from '../hooks/useReviews';
import type { PublicReview, ReviewBook, ReviewFilter } from '../types';
import { RatingStars } from './RatingStars';
import { RatingSummary } from './RatingSummary';
import styles from './Review.module.css';
import { ReviewDialog } from './ReviewDialog';

/** Nội dung dài hơn chừng này ký tự → thu gọn + "Xem thêm" */
const LONG_CONTENT = 300;

const formatDate = (value: string) => formatDateTime(value).slice(0, 10);

function ReviewItem({ review }: { review: PublicReview }) {
  const [expanded, setExpanded] = useState(false);
  const long = (review.content?.length ?? 0) > LONG_CONTENT;
  return (
    <li className={styles.item}>
      <div className={styles.who}>
        <b>{review.authorName}</b>
        <span className={styles.bought}>✦ Đã mua hàng</span>
      </div>
      <div className={styles.when}>
        <RatingStars value={review.rating} size={16} />
        <span>
          {formatDate(review.createdAt)}
          {review.isEdited && ' (đã chỉnh sửa)'}
        </span>
      </div>
      {review.content && (
        <>
          <p className={`${styles.content} ${long && !expanded ? styles.clamp : ''}`}>
            {review.content}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className={styles.link}
            >
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </>
      )}
    </li>
  );
}

/** Viết / sửa đánh giá ở trang sách: theo đơn Đã giao còn được viết & đánh giá đã có */
function WriteReview({ book }: { book: ReviewBook }) {
  const status = useReviewStatus(book.id);
  const [dialog, setDialog] = useState<'write' | 'edit' | null>(null);

  if (!status.data) return null;
  const { reviewableOrders, myReviews } = status.data;
  const latest = myReviews[0];

  return (
    <div className={styles.write}>
      {reviewableOrders.length > 0 ? (
        <button type="button" className="btn btn-ink" onClick={() => setDialog('write')}>
          Viết đánh giá
        </button>
      ) : latest ? (
        <>
          <span className={styles.note}>Bạn đã đánh giá sách này</span>
          {latest.canEdit && (
            <button type="button" className="btn btn-ink btn-sm" onClick={() => setDialog('edit')}>
              Sửa đánh giá
            </button>
          )}
        </>
      ) : null}
      {latest?.isHidden && (
        <p className={styles.hidden} role="alert">
          Đánh giá của bạn đã bị ẩn do vi phạm quy định cộng đồng.
        </p>
      )}
      {dialog && (
        <ReviewDialog
          book={book}
          orders={reviewableOrders}
          review={dialog === 'edit' ? latest : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}

const FILTERS: { label: string; filter: ReviewFilter }[] = [
  { label: 'Tất cả', filter: {} },
  ...[5, 4, 3, 2, 1].map((rating) => ({ label: `${rating} sao`, filter: { rating } })),
  { label: 'Có nội dung', filter: { withContent: true } },
];

/** Tab "Đánh giá" ở trang chi tiết sách (M10 mục 4.1) — nằm trên giấy da */
export function BookReviews({ book }: { book: ReviewBook }) {
  const [filter, setFilter] = useState<ReviewFilter>({});
  const [page, setPage] = useState(1);
  const summary = useReviewSummary(book.id);
  const reviews = useReviews(book.id, filter, page);

  const applyFilter = (next: ReviewFilter) => {
    setFilter(next);
    setPage(1);
  };
  const sameFilter = (other: ReviewFilter) =>
    other.rating === filter.rating && Boolean(other.withContent) === Boolean(filter.withContent);

  if (summary.isPending) return <div className={`o-skel ${styles.skeleton}`} />;
  const count = summary.data?.count ?? 0;

  return (
    <div className={styles.root}>
      <div className={styles.top}>
        {summary.data && count > 0 ? (
          <RatingSummary
            summary={summary.data}
            activeRating={filter.rating}
            onSelectRating={(rating) => applyFilter(rating ? { rating } : {})}
          />
        ) : (
          <p className={styles.empty}>Chưa có đánh giá nào cho sản phẩm này.</p>
        )}
        <WriteReview book={book} />
      </div>

      {count > 0 && (
        <>
          <div className={`scroll-x ${styles.filters}`}>
            {FILTERS.map(({ label, filter: option }) => (
              <button
                key={label}
                type="button"
                className={`chip chip-soft ${styles.chip}`}
                aria-pressed={sameFilter(option)}
                onClick={() => applyFilter(option)}
              >
                {label}
              </button>
            ))}
          </div>

          {reviews.data && reviews.data.items.length === 0 ? (
            <p className={styles.empty}>Không có đánh giá phù hợp.</p>
          ) : (
            <ul className={`${styles.list} ${reviews.isPlaceholderData ? styles.busy : ''}`}>
              {reviews.data?.items.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </ul>
          )}

          {(reviews.data?.meta?.totalPages ?? 1) > 1 && (
            <div className={styles.pager}>
              <Pagination
                page={page}
                count={reviews.data?.meta?.totalPages ?? 1}
                onChange={(_, next) => setPage(next)}
                sx={{
                  '& .MuiPaginationItem-root': { color: 'var(--color-ink)' },
                  '& .Mui-selected': {
                    backgroundColor: 'var(--color-ink) !important',
                    color: 'var(--color-parch)',
                  },
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
