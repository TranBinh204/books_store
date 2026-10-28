'use client';

import { useEffect } from 'react';

/** Cuộn quá mốc này mới coi là "đã cuộn" (hiện nút lên đầu trang) — demo 07 */
const SCROLLED_AT = 40;
/** Cuộn xuống quá mốc này thì ẩn header */
const HIDE_HEADER_AT = 300;

/**
 * Hiệu ứng theo cuộn cho cả trang (demo 07: BS.scrollFx):
 * - `--scroll` (0 → 1) trên <html> cho parallax trăng / chữ nền
 * - `body.scrolled` (hiện BackToTop), `body.scroll-down` (ẩn header)
 */
export function useScrollFx() {
  useEffect(() => {
    const root = document.documentElement;
    let last = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const max = root.scrollHeight - window.innerHeight;
      root.style.setProperty('--scroll', (y / Math.max(1, max)).toFixed(4));
      document.body.classList.toggle('scrolled', y > SCROLLED_AT);
      document.body.classList.toggle('scroll-down', y > last && y > HIDE_HEADER_AT);
      last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
}
