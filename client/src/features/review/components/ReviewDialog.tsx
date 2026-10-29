'use client';

import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { BookCover } from '@/components/shop/BookCover';
import { Modal } from '@/components/ui/Modal';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { errorMessage } from '@/lib/form';
import { useSaveReview } from '../hooks/useReviews';
import type { MyReview, ReviewBook } from '../types';
import { RatingInput } from './RatingInput';
import styles from './ReviewDialog.module.css';

const CONTENT_MIN = 10;
const CONTENT_MAX = 1000;

/**
 * Viết / sửa đánh giá (M10 mục 4.2). Mở mới mỗi lần (key ở nơi dùng) → không cần reset state.
 * - Viết: `orders` = các đơn Đã giao còn được viết (> 1 đơn → chọn đơn)
 * - Sửa: `review` = đánh giá đang sửa
 */
export function ReviewDialog({
  book,
  orders = [],
  review,
  onClose,
}: {
  book: ReviewBook;
  orders?: { orderId: number; code: string }[];
  review?: MyReview;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const save = useSaveReview(book.id);
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [content, setContent] = useState(review?.content ?? '');
  const [orderId, setOrderId] = useState(review?.orderId ?? orders[0]?.orderId ?? 0);

  const trimmed = content.trim();
  const contentError =
    trimmed.length > 0 && trimmed.length < CONTENT_MIN
      ? `Nhận xét tối thiểu ${CONTENT_MIN} ký tự (hoặc để trống)`
      : null;
  const canSubmit = rating > 0 && orderId > 0 && !contentError && !save.isPending;

  const submit = () =>
    save.mutate(
      { reviewId: review?.id, orderId, payload: { rating, content: trimmed || null } },
      {
        onSuccess: () => {
          enqueueSnackbar(review ? 'Đã cập nhật đánh giá' : 'Cảm ơn bạn đã đánh giá!', {
            variant: 'success',
          });
          onClose();
        },
      },
    );

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!save.isPending}
      chapter="✦ Đánh giá"
      title={
        review ? (
          <>
            Sửa <em>đánh giá</em>
          </>
        ) : (
          <>
            Đánh giá <em>sản phẩm</em>
          </>
        )
      }
    >
      <div className={styles.body}>
        {save.isError && (
          <p className={styles.fail} role="alert">
            {errorMessage(save.error)}
          </p>
        )}

        <div className={styles.book}>
          <span className={styles.cover}>
            <BookCover url={book.image} alt={book.title} sizes="64px" seed={book.id} />
          </span>
          <span className={styles.name}>{book.title}</span>
        </div>

        {!review && orders.length > 1 && (
          <label className={styles.pick}>
            <span>Đánh giá cho đơn hàng</span>
            <select
              className="field"
              value={orderId}
              onChange={(event) => setOrderId(Number(event.target.value))}
            >
              {orders.map((order) => (
                <option key={order.orderId} value={order.orderId}>
                  {order.code}
                </option>
              ))}
            </select>
          </label>
        )}

        <RatingInput value={rating} onChange={setRating} />

        <TextAreaField
          label="Nhận xét (không bắt buộc)"
          placeholder="Chia sẻ cảm nhận của bạn về nội dung, chất lượng in, đóng gói…"
          value={content}
          onChange={setContent}
          maxLength={CONTENT_MAX}
          error={contentError}
        />

        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={save.isPending}
          >
            <span>Đóng</span>
          </button>
          <button
            type="button"
            className="btn btn-gold"
            onClick={submit}
            disabled={!canSubmit}
            aria-busy={save.isPending}
          >
            <span>{review ? 'Cập nhật' : 'Gửi đánh giá'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
