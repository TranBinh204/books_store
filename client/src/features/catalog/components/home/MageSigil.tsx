import type { CSSProperties } from 'react';
import { hueFromId } from '@/lib/format';
import styles from './MageSigil.module.css';

/** Chữ viết tắt: 2 chữ cái đầu của 2 từ cuối ("Nguyễn Nhật Ánh" → "NÁ") */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .slice(-2)
    .join('')
    .toUpperCase();
}

/**
 * Huy hiệu tác giả: vòng ấn chú xoay quanh chữ viết tắt, màu theo `hue` của tác giả.
 * `size` (px): cỡ huy hiệu. Muốn hiệu ứng hover theo cả khối cha thì cho khối cha class `sigil-host`.
 */
export function MageSigil({
  id,
  name,
  size = 150,
  className = '',
}: {
  id: number;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`${styles.sigil} ${className}`}
      style={{ '--h': hueFromId(id), '--sigil-size': `${size}px` } as CSSProperties}
    >
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true">
        <circle cx="50" cy="50" r="47" strokeDasharray="2 4" />
        <circle cx="50" cy="50" r="42" />
        <path
          d="M50 3 L58 20 L50 14 L42 20Z M97 50 L80 58 L86 50 L80 42Z M50 97 L42 80 L50 86 L58 80Z M3 50 L20 42 L14 50 L20 58Z"
          fill="currentColor"
        />
      </svg>
      <span>{initials(name)}</span>
    </div>
  );
}
