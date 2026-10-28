'use client';

import { useEffect } from 'react';

/** Lề trước khi coi là "khuất" — demo 07: rootMargin 120px */
const PAUSE_MARGIN = '120px 0px';

/**
 * Khối nào ra khỏi màn hình thì tạm dừng mọi animation **lặp vô hạn** bên trong (đỡ tốn CPU/GPU) —
 * design-system mục 8.3. Khối cần theo dõi gắn `data-pausable`.
 * Dừng / chạy bằng Web Animations API (`getAnimations` → pause / play): không sửa class hay thuộc tính
 * → không lệch hydration.
 */
export function usePauseOffscreen() {
  useEffect(() => {
    const loops = (el: Element) =>
      el
        .getAnimations({ subtree: true })
        .filter((a) => a.effect?.getTiming().iterations === Infinity);

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) =>
          loops(entry.target).forEach((a) => (entry.isIntersecting ? a.play() : a.pause())),
        ),
      { rootMargin: PAUSE_MARGIN },
    );
    const watched = new WeakSet<Element>();
    const scan = () =>
      document.querySelectorAll('[data-pausable]').forEach((el) => {
        if (watched.has(el)) return;
        watched.add(el);
        io.observe(el);
      });

    scan();
    let frame = 0;
    const mo = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        scan();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
}
