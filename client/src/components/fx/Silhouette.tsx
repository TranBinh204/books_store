import type { CSSProperties } from 'react';

/**
 * Bóng đen trang trí (class `.silhouette` trong styles/ui.css) — path SVG chép nguyên từ demo 07.
 * Vị trí / cỡ truyền qua `style`. `hideOnMobile`: ẩn ở màn ≤ 900px.
 */
type Shape = 'branch' | 'bat' | 'bats' | 'castle' | 'castle-lit' | 'treeline';

const LIT = '#e0b56a';

function Art({ shape }: { shape: Shape }) {
  switch (shape) {
    case 'branch': // cành cây khô bên trái hero
      return (
        <svg viewBox="0 0 360 520" fill="currentColor">
          <path d="M0 0h40c6 60 10 120 40 170 20-40 30-90 20-140 18 50 14 100-6 150 30 20 70 26 120 10-40 30-90 36-130 22 20 40 60 70 120 80-60 6-110-16-140-56-10 60 0 120 30 170-40-30-60-90-60-150-10 70-30 140-30 220H0z" />
        </svg>
      );
    case 'bat':
      return (
        <svg viewBox="0 0 64 28">
          <use href="#bat" />
        </svg>
      );
    case 'bats': // đàn 4 con dơi
      return (
        <svg viewBox="0 0 240 90">
          <use href="#bat" x="0" y="20" width="60" height="26" />
          <use href="#bat" x="70" y="0" width="44" height="20" />
          <use href="#bat" x="130" y="34" width="54" height="24" />
          <use href="#bat" x="190" y="8" width="36" height="16" />
        </svg>
      );
    case 'castle': // lâu đài ma trên cành cây
      return (
        <svg viewBox="0 0 220 170" fill="currentColor">
          <path d="M0 150c60-10 120-14 220-6v8c-90-6-150-2-220 8z" />
          <path d="M60 148V80l20-30 20 30v-18l14-22 14 22v86z" />
          <rect x="72" y="92" width="10" height="16" rx="5" fill={LIT} />
          <rect x="100" y="100" width="10" height="14" rx="5" fill={LIT} />
          <rect x="120" y="78" width="8" height="12" rx="4" fill={LIT} />
        </svg>
      );
    case 'castle-lit': // lâu đài sáng đèn (mép footer)
      return (
        <svg viewBox="0 0 160 120" fill="currentColor">
          <path d="M10 120V64L40 30l30 34v-20l20-26 20 26v20l40 0v56z" />
          <rect x="34" y="70" width="12" height="18" rx="6" fill={LIT} />
          <rect x="84" y="52" width="10" height="16" rx="5" fill={LIT} />
          <rect x="118" y="80" width="12" height="16" rx="6" fill={LIT} />
        </svg>
      );
    case 'treeline': // rặng cây đen dưới đáy hero
      return (
        <svg viewBox="0 0 1440 150" preserveAspectRatio="none" fill="var(--color-night)">
          <path d="M0 150V96l40-20 30 18 26-44 22 38 40-30 36 34 30-56 26 46 44-24 30 30 40-60 30 52 46-22 34 26 26-40 30 36 50-18 30 22 40-48 26 44 44-20 40 30 30-54 30 46 50-26 30 28 26-40 30 34 46-16 36 24 30-50 26 42 44-22 40 32 34-46 30 40 56-24L1440 84V150z" />
        </svg>
      );
  }
}

export function Silhouette({
  shape,
  style,
  hideOnMobile = false,
  className = '',
}: {
  shape: Shape;
  style?: CSSProperties;
  hideOnMobile?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`silhouette ${shape === 'bat' ? 'bat' : ''} ${hideOnMobile ? 'hide-m' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    >
      <Art shape={shape} />
    </span>
  );
}
