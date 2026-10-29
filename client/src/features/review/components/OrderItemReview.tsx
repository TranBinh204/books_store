'use client';

import { useState } from 'react';
import { useOrderReviews } from '../hooks/useReviews';
import type { ReviewBook } from '../types';
import { RatingStars } from './RatingStars';
import { ReviewDialog } from './ReviewDialog';

/**
 * Nút đánh giá cho 1 sách trong chi tiết đơn Đã giao (M10 mục 4.3):
 * chưa viết → "Đánh giá" · đã viết → sao + "Sửa đánh giá" (còn hạn) / "Đã bị ẩn".
 * Mọi dòng của 1 đơn dùng chung 1 lần gọi API (cache React Query).
 */
export function OrderItemReview({
  orderId,
  orderCode,
  book,
}: {
  orderId: number;
  orderCode: string;
  book: ReviewBook;
}) {
  const reviews = useOrderReviews(orderId, true);
  const [open, setOpen] = useState(false);
  if (!reviews.data) return null;

  const review = reviews.data.find((item) => item.bookId === book.id);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {review ? (
        <>
          <RatingStars value={review.rating} size={16} />
          {review.isHidden ? (
            <span className="text-xs" style={{ color: 'var(--color-bone-2)' }}>
              Đánh giá đã bị ẩn
            </span>
          ) : (
            review.canEdit && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
                <span>Sửa đánh giá</span>
              </button>
            )
          )}
        </>
      ) : (
        <button type="button" className="btn btn-gold btn-sm" onClick={() => setOpen(true)}>
          <span>Đánh giá</span>
        </button>
      )}
      {open && (
        <ReviewDialog
          book={book}
          orders={[{ orderId, code: orderCode }]}
          review={review}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

/** Còn sách chưa đánh giá trong đơn? (gợi ý ở đầu khung Sản phẩm) */
export function useHasUnreviewed(orderId: number, bookIds: number[], enabled: boolean) {
  const reviews = useOrderReviews(orderId, enabled);
  return Boolean(reviews.data && bookIds.some((id) => !reviews.data.some((r) => r.bookId === id)));
}
