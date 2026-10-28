'use client';

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

const COUNT = 70;
/** Độ nét tối đa 1,5x để đỡ tốn GPU — demo 07 */
const MAX_DPR = 1.5;
/** Chuột trong bán kính này (px) thì đom đóm bị hút lại gần */
const ATTRACT_RADIUS = 200;

/**
 * Đom đóm trên canvas (design-system 8.2, 8.3): vẽ sẵn 1 hạt sáng rồi in lại (không tạo gradient
 * mỗi khung hình); chỉ chạy khi khung cha đang hiện trên màn và tab đang mở; tắt khi giảm chuyển động.
 * Canvas lấp đầy phần tử cha (cha cần `position: relative`).
 */
export function Fireflies({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const host = cv?.parentElement;
    const ctx = cv?.getContext('2d');
    if (!cv || !host || !ctx || prefersReducedMotion()) return;

    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    let W = 0;
    let H = 0;
    let mouse = { x: -999, y: -999 };
    const flies = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 2 + 0.6,
      s: Math.random() * 0.0006 + 0.0002,
      a: Math.random() * Math.PI * 2,
      p: Math.random() * Math.PI * 2,
    }));

    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext('2d')!;
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,230,160,1)');
    grad.addColorStop(1, 'rgba(255,200,100,0)');
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 64, 64);

    const size = () => {
      W = cv.width = host.clientWidth * dpr;
      H = cv.height = host.clientHeight * dpr;
    };
    size();
    window.addEventListener('resize', size);

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      mouse = { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
    };
    host.addEventListener('pointermove', onMove);

    let visible = true;
    let flying = false;
    let frame = 0;
    const draw = (t: number) => {
      if (!visible || document.hidden) {
        flying = false;
        return;
      }
      ctx.clearRect(0, 0, W, H);
      for (const f of flies) {
        f.a += (Math.random() - 0.5) * 0.2;
        f.x += Math.cos(f.a) * f.s;
        f.y += Math.sin(f.a) * f.s - 0.0002;
        if (f.y < -0.05) f.y = 1.05;
        if (f.x < -0.05) f.x = 1.05;
        if (f.x > 1.05) f.x = -0.05;
        const x = f.x * W;
        const y = f.y * H;
        const dx = mouse.x - x;
        const dy = mouse.y - y;
        if (Math.hypot(dx, dy) < ATTRACT_RADIUS * dpr) {
          f.x += (dx / W) * 0.012;
          f.y += (dy / H) * 0.012;
        }
        const rad = f.r * 8 * dpr;
        ctx.globalAlpha = 0.9 * ((Math.sin(t / 600 + f.p) + 1) / 2) + 0.1;
        ctx.drawImage(sprite, x - rad, y - rad, rad * 2, rad * 2);
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    const fly = () => {
      if (!flying && visible && !document.hidden) {
        flying = true;
        frame = requestAnimationFrame(draw);
      }
    };
    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      fly();
    });
    io.observe(host);
    document.addEventListener('visibilitychange', fly);

    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', size);
      host.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', fly);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
