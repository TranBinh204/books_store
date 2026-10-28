'use client';

import { useEffect, useRef, useState } from 'react';
import { useTopLayer } from '@/hooks/useTopLayer';
import { hasFinePointer, prefersReducedMotion } from '@/lib/motion';
import styles from './ClickDust.module.css';

/** Màu bụi tiên (rgb) — demo 07 */
const GOLDS = ['226,196,143', '246,231,193', '255,214,140', '255,244,214'];
const MAX_PARTICLES = 60;
const BURST_COUNT = 22;
/** Độ nét tối đa 1,5x để đỡ tốn GPU (giống Fireflies) */
const MAX_DPR = 1.5;
/** Số px của ảnh vẽ sẵn cho mỗi đơn vị bán kính hạt — đủ nét khi phóng to */
const SPRITE_SCALE = 8;
/** Bán kính (theo đơn vị bán kính hạt) của quầng sáng, chấm và ngôi sao — gồm cả phần tỏa sáng */
const HALO_EXTENT = 5;
const DOT_EXTENT = 6;
const STAR_EXTENT = 9;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  c: number;
  star: boolean;
  rot: number;
  ph: number;
}

interface SpriteSet {
  halo: HTMLCanvasElement;
  dot: HTMLCanvasElement;
  star: HTMLCanvasElement;
}

/** Vẽ sẵn 1 ảnh vuông, tâm ở giữa, đơn vị = bán kính hạt */
function makeSprite(extent: number, paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = extent * 2 * SPRITE_SCALE;
  const g = c.getContext('2d')!;
  g.translate(c.width / 2, c.height / 2);
  g.scale(SPRITE_SCALE, SPRITE_SCALE);
  paint(g);
  return c;
}

// Ngôi sao 4 cánh nhỏ
function sparkle(g: CanvasRenderingContext2D, r: number) {
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const k = i % 2 ? r * 0.35 : r;
    g.lineTo(Math.cos(a) * k, Math.sin(a) * k);
  }
  g.closePath();
  g.fill();
}

/** Quầng sáng + chấm + ngôi sao cho từng màu — vẽ 1 lần thay vì tạo gradient / shadowBlur mỗi khung hình */
function makeSprites(): SpriteSet[] {
  // shadowBlur tính theo px ảnh, ảnh sẽ thu về ~bán kính hạt (≈2px/đơn vị) → 40 ≈ 10px trên màn
  const glow = 40;
  return GOLDS.map((c) => ({
    halo: makeSprite(HALO_EXTENT, (g) => {
      const halo = g.createRadialGradient(0, 0, 0, 0, 0, HALO_EXTENT);
      halo.addColorStop(0, `rgba(${c},0.45)`);
      halo.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = halo;
      g.beginPath();
      g.arc(0, 0, HALO_EXTENT, 0, Math.PI * 2);
      g.fill();
    }),
    dot: makeSprite(DOT_EXTENT, (g) => {
      g.fillStyle = g.shadowColor = `rgb(${c})`;
      g.shadowBlur = glow;
      g.beginPath();
      g.arc(0, 0, 1, 0, Math.PI * 2);
      g.fill();
    }),
    star: makeSprite(STAR_EXTENT, (g) => {
      g.fillStyle = g.shadowColor = `rgb(${c})`;
      g.shadowBlur = glow;
      sparkle(g, 3.6);
    }),
  }));
}

/**
 * Con trỏ Dark Fantasy (design-system mục 8.2): hình con trỏ là SVG trong CSS (`body.has-cursor`,
 * hệ điều hành tự vẽ — không tốn JS); component này bật lớp đó khi máy có chuột và tung bụi tiên
 * mỗi lần bấm (tắt khi giảm chuyển động). Canvas chỉ chạy khi còn hạt bụi.
 */
export function ClickDust() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Nằm trong lớp trên cùng để không bị hộp thoại <dialog> che mất
  useTopLayer(canvasRef, enabled);

  useEffect(() => {
    if (!hasFinePointer()) return;
    document.body.classList.add('has-cursor');
    // Chỉ biết sau khi chạy ở trình duyệt — server luôn vẽ "không có bụi"
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(!prefersReducedMotion());
    return () => document.body.classList.remove('has-cursor');
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!enabled || !canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio, MAX_DPR);
    const fit = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    fit();
    window.addEventListener('resize', fit);

    const sprites = makeSprites();
    const dust: Particle[] = [];
    let running = false;
    let frame = 0;

    const tick = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = 'lighter'; // hạt chồng nhau thì cộng sáng
      for (let i = dust.length - 1; i >= 0; i--) {
        const p = dust[i];
        p.vy += 0.018;
        p.vx *= 0.98;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += 0.08;
        if (--p.life <= 0) {
          dust.splice(i, 1);
          continue;
        }
        const k = p.life / p.max;
        const s = sprites[p.c];
        ctx.globalAlpha = Math.min(1, k * 1.3) * (0.75 + 0.25 * Math.sin(p.life * 0.4 + p.ph));
        // quầng sáng mờ phía sau
        const h = p.r * HALO_EXTENT;
        ctx.drawImage(s.halo, p.x - h, p.y - h, h * 2, h * 2);
        if (p.star) {
          const cos = Math.cos(p.rot) * dpr;
          const sin = Math.sin(p.rot) * dpr;
          const e = p.r * STAR_EXTENT;
          ctx.setTransform(cos, sin, -sin, cos, p.x * dpr, p.y * dpr);
          ctx.drawImage(s.star, -e, -e, e * 2, e * 2);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        } else {
          const e = p.r * (0.6 + k * 0.4) * DOT_EXTENT;
          ctx.drawImage(s.dot, p.x - e, p.y - e, e * 2, e * 2);
        }
      }
      if (dust.length) frame = requestAnimationFrame(tick);
      else running = false;
    };

    const spawn = (x: number, y: number, vx: number, vy: number) => {
      if (dust.length > MAX_PARTICLES) dust.shift();
      const life = 55 + Math.random() * 40;
      dust.push({
        x,
        y,
        vx,
        vy,
        life,
        max: life,
        r: Math.random() * 1.6 + 1.2,
        c: (Math.random() * GOLDS.length) | 0,
        star: Math.random() < 0.28,
        rot: Math.random() * Math.PI,
        ph: Math.random() * 6,
      });
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    };

    const onDown = (e: PointerEvent) => {
      for (let i = 0; i < BURST_COUNT; i++) {
        const a = (i / BURST_COUNT) * Math.PI * 2;
        const s = 1.6 + Math.random() * 2.2;
        spawn(e.clientX, e.clientY, Math.cos(a) * s, Math.sin(a) * s - 0.6);
      }
    };

    window.addEventListener('pointerdown', onDown);

    return () => {
      window.removeEventListener('resize', fit);
      window.removeEventListener('pointerdown', onDown);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  if (!enabled) return null;

  return <canvas ref={canvasRef} className={styles.dust} popover="manual" aria-hidden="true" />;
}
