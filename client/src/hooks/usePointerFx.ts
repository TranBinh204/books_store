'use client';

import { useEffect } from 'react';
import { canUsePointerFx, isHydrated } from '@/lib/motion';

/** Góc nghiêng tối đa mặc định (độ) — demo 07: BS.tilt('.cover', 12) */
const DEFAULT_TILT = 12;

/**
 * Hiệu ứng theo chuột cho cả trang, gắn bằng thuộc tính (dùng được trong Server Component):
 * - `data-tilt="12"`: nghiêng 3D theo chuột, set --rx / --ry / --mx / --my (BS.tilt)
 * - `data-magnetic`: nút bị hút nhẹ theo chuột (BS.magnetic)
 * Tắt trên màn cảm ứng và khi giảm chuyển động.
 */
export function usePointerFx() {
  useEffect(() => {
    if (!canUsePointerFx()) return;

    let tiltEl: HTMLElement | null = null;
    let magnetEl: HTMLElement | null = null;

    const resetTilt = (el: HTMLElement) => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    };

    const onMove = (e: PointerEvent) => {
      const target = e.target as Element | null;

      // Chỉ phần tử React đã hydrate (rê chuột quá sớm → bỏ qua, tránh lệch hydration)
      const tilt = ((el) => (el && isHydrated(el) ? el : null))(
        target?.closest<HTMLElement>('[data-tilt]') ?? null,
      );
      if (tiltEl && tiltEl !== tilt) resetTilt(tiltEl);
      tiltEl = tilt;
      if (tilt) {
        const max = parseFloat(tilt.dataset.tilt || '') || DEFAULT_TILT;
        const r = tilt.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        tilt.style.setProperty('--ry', `${((x - 0.5) * max * 2).toFixed(2)}deg`);
        tilt.style.setProperty('--rx', `${((0.5 - y) * max * 2).toFixed(2)}deg`);
        tilt.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        tilt.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      }

      const magnet = ((el) => (el && isHydrated(el) ? el : null))(
        target?.closest<HTMLElement>('[data-magnetic]') ?? null,
      );
      if (magnetEl && magnetEl !== magnet) magnetEl.style.translate = '';
      magnetEl = magnet;
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) * 0.25;
        const dy = (e.clientY - r.top - r.height / 2) * 0.35;
        // Dùng `translate` thay vì `transform` để không đè transform riêng của nút
        magnet.style.translate = `${dx}px ${dy}px`;
      }
    };

    const onLeave = () => {
      if (tiltEl) resetTilt(tiltEl);
      if (magnetEl) magnetEl.style.translate = '';
      tiltEl = magnetEl = null;
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);
}
