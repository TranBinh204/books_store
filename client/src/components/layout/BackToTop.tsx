'use client';

import styles from './BackToTop.module.css';

/** Nút lên đầu trang — chỉ hiện khi đã cuộn (body.scrolled do hooks/useScrollFx gắn) */
export function BackToTop() {
  return (
    <button
      type="button"
      className={`diamond ${styles.totop}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Lên đầu trang"
    >
      <span>↑</span>
    </button>
  );
}
