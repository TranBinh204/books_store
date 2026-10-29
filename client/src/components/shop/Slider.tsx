'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './Slider.module.css';

/** Mỗi lần bấm mũi tên trượt 85% bề rộng — demo 07 */
const STEP_RATIO = 0.85;
/** Kéo quá số px này mới coi là kéo (chặn click mở sách) */
const DRAG_THRESHOLD = 4;

/**
 * Thanh trượt ngang dùng `scroll-snap` của trình duyệt (không dùng Swiper — components.md Q4):
 * 5 → 4 → 64%/mục theo màn hình · kéo bằng chuột · nút thoi ‹ › · thanh tiến độ có ngôi sao.
 */
export function Slider({ children, label }: { children: ReactNode; label: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    // Cập nhật thẳng DOM (không setState) — chạy theo từng sự kiện cuộn
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      if (prevRef.current) prevRef.current.disabled = track.scrollLeft < 4;
      if (nextRef.current) nextRef.current.disabled = track.scrollLeft > max - 4;
      root.style.setProperty('--progress', (track.scrollLeft / Math.max(1, max)).toFixed(3));
    };
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    // Kéo bằng chuột (bắt đầu ở chỗ trống, không phải nút / link)
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || (e.target as Element).closest('button, a')) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.setAttribute('data-dragging', '');
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      if (Math.abs(e.clientX - startX) > DRAG_THRESHOLD) moved = true;
      track.scrollLeft = startLeft - (e.clientX - startX);
    };
    const onUp = () => {
      down = false;
      track.removeAttribute('data-dragging');
    };
    const onClick = (e: MouseEvent) => {
      if (!moved) return;
      e.preventDefault();
      e.stopPropagation();
      moved = false;
    };
    track.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    track.addEventListener('click', onClick, true);

    return () => {
      track.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      track.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      track.removeEventListener('click', onClick, true);
    };
  }, []);

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (track)
      track.scrollBy({ left: direction * track.clientWidth * STEP_RATIO, behavior: 'smooth' });
  };

  return (
    <div ref={rootRef} className={styles.slider} role="region" aria-label={label}>
      <div ref={trackRef} className={styles.track} data-stagger="">
        {children}
      </div>
      <div className={styles.ctrls}>
        <button
          ref={prevRef}
          type="button"
          className={`diamond ${styles.nb}`}
          onClick={() => scrollBy(-1)}
          aria-label="Trước"
        >
          <span>‹</span>
        </button>
        <div className={styles.pbar} aria-hidden="true" />
        <button
          ref={nextRef}
          type="button"
          className={`diamond ${styles.nb}`}
          onClick={() => scrollBy(1)}
          aria-label="Sau"
        >
          <span>›</span>
        </button>
      </div>
    </div>
  );
}
