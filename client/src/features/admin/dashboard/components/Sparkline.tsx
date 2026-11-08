const WIDTH = 120;
const HEIGHT = 32;
const PAD = 3;

/** Đường xu hướng nhỏ (trang trí, ẩn với trình đọc màn hình) — vàng, nền mờ phía dưới */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * WIDTH;
    // Tất cả bằng nhau (vd toàn 0) → đường phẳng ở đáy
    const y =
      span === 0 ? HEIGHT - PAD : HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = points.join(' ');
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
      className={className}
    >
      <polygon points={`0,${HEIGHT} ${line} ${WIDTH},${HEIGHT}`} fill="rgba(226, 196, 143, 0.12)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--color-gold-hi)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
