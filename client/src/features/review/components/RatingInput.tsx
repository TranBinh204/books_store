'use client';

import { useState } from 'react';
import { IconStar } from '@/components/ui/icons';
import styles from './RatingInput.module.css';

export const RATING_LABELS = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Tuyệt vời'];

/** Chọn 1–5 sao — rê chuột hiện chữ mô tả (M10 mục 4.2) */
export function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className={styles.box}>
      <div
        className={styles.stars}
        role="radiogroup"
        aria-label="Chọn số sao"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} sao — ${RATING_LABELS[star]}`}
            data-on={star <= shown}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
          >
            <IconStar width="40" height="40" fill={star <= shown ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <span className={styles.label}>{RATING_LABELS[shown]}</span>
    </div>
  );
}
