import { IconStar } from '@/components/ui/icons';

/** Hiển thị sao (hỗ trợ nửa sao: 4.5 → ★★★★⯪). Không có state → dùng được ở Server Component */
export function RatingStars({ value, size = 18 }: { value: number; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center text-amber-400"
      role="img"
      aria-label={`${value} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = value >= star ? 1 : value >= star - 0.5 ? 0.5 : 0;
        return (
          <span key={star} className="relative inline-flex" style={{ width: size, height: size }}>
            <IconStar width={size} height={size} />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <IconStar width={size} height={size} fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
