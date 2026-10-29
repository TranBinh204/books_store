'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './SoldProgress.module.css';

/** Từ 85% suất đã bán → "Sắp tan biến" (demo 07) */
const ALMOST_GONE = 0.85;

/** Thanh lửa "Đã bán 12/50" (M12 mục 4.1) — chạy từ 0 lên khi cuộn tới; hết suất đổi chữ */
export function SoldProgress({ sold, quantity }: { sold: number; quantity: number }) {
  const ratio = quantity > 0 ? Math.min(sold / quantity, 1) : 1;
  const percent = Math.round(ratio * 100);
  const ref = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

  // Cuộn tới thì thanh lửa chạy lên (1 lần)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      setFilled(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const right =
    sold >= quantity ? 'Hết suất' : ratio >= ALMOST_GONE ? 'Sắp tan biến' : `${percent}%`;

  return (
    <div className={styles.souls}>
      <div
        ref={ref}
        className={styles.bar}
        data-filled={filled ? '' : undefined}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i style={{ '--w': `${percent}%` } as React.CSSProperties} />
      </div>
      <small>
        <span>
          Đã bán {sold}/{quantity}
        </span>
        <span>{right}</span>
      </small>
    </div>
  );
}
