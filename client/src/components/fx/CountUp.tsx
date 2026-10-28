'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

const DURATION_MS = 1600;
const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');

/**
 * Số đếm từ 0 lên `value` khi cuộn tới (demo 07: data-count, ease-out bậc 4).
 * React tự quản lý chữ số → không lệch hydration. Giảm chuyển động → hiện ngay.
 */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        if (prefersReducedMotion()) {
          setShown(value);
          return;
        }
        const t0 = performance.now();
        const step = (t: number) => {
          const k = Math.min(1, (t - t0) / DURATION_MS);
          setShown(value * (1 - Math.pow(1 - k, 4)));
          if (k < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{fmt(shown)}</span>;
}
