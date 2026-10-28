'use client';

import { useEffect } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

const REVEAL_MS = 1100;
const STAGGER_STEP_MS = 90;
const EASE = 'cubic-bezier(.2,.8,.2,1)';
/** Phần tử hiện dần: tự gắn `data-reveal` hoặc là con trực tiếp của khối `data-stagger` */
const SELECTOR = '[data-reveal], [data-stagger] > *';

/** Kiểu hiện: '' (trồi lên) | 'deal' (rơi xuống như chia bài) */
function variantOf(el: Element) {
  return el.getAttribute('data-reveal') ?? el.parentElement?.getAttribute('data-stagger') ?? '';
}

/** Thứ tự trong khối stagger → độ trễ (demo: --i * 90ms) */
function indexOf(el: Element) {
  if (el.hasAttribute('data-reveal') || !el.parentElement?.hasAttribute('data-stagger')) return 0;
  return Array.prototype.indexOf.call(el.parentElement.children, el);
}

/**
 * Hiện dần khi cuộn cho cả trang (demo 07: BS.reveal) — design-system 8.2.
 * Trạng thái ẩn ban đầu do CSS lo (styles/motion.css); khi cuộn tới thì chạy bằng
 * Web Animations API với `fill: forwards`. **Không sửa thuộc tính / class / style của phần tử**
 * → không bao giờ lệch hydration với HTML server gửi về (kể cả phần trong <Suspense>).
 * Chỉ động vào các thuộc tính riêng `opacity`, `translate`, `rotate`, `scale`, `filter`
 * nên không đè `transform` của hiệu ứng hover.
 */
export function useReveal() {
  useEffect(() => {
    const reduce = prefersReducedMotion();
    const done = new WeakSet<Element>();

    const play = (el: Element) => {
      if (done.has(el)) return;
      done.add(el);
      const deal = variantOf(el) === 'deal';
      const i = indexOf(el);
      const from = deal
        ? {
            opacity: 0,
            translate: '0 -120px',
            rotate: `${(i - 1.5) * 14}deg`,
            scale: '0.7',
            filter: 'blur(6px)',
          }
        : { opacity: 0, translate: '0 40px', filter: 'blur(6px)' };
      el.animate(
        [from, { opacity: 1, translate: '0 0', rotate: '0deg', scale: '1', filter: 'blur(0)' }],
        {
          duration: reduce ? 0 : REVEAL_MS,
          delay: reduce ? 0 : i * STAGGER_STEP_MS,
          easing: EASE,
          fill: 'forwards',
        },
      );
    };

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          io.unobserve(entry.target);
          play(entry.target);
        }),
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    const watched = new WeakSet<Element>();
    const scan = () =>
      document.querySelectorAll(SELECTOR).forEach((el) => {
        if (watched.has(el)) return;
        watched.add(el);
        io.observe(el);
      });

    scan();
    // Gom nhiều thay đổi DOM trong 1 khung hình thành 1 lần quét
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
