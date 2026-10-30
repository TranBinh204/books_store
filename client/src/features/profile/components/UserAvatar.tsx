import styles from './UserAvatar.module.css';

/** Chữ cái đầu của TÊN (tên người Việt đứng cuối): "Nguyễn Văn An" → "A" */
export function initialOf(fullName: string) {
  const words = fullName.trim().split(/\s+/);
  return (words[words.length - 1]?.[0] ?? '?').toLocaleUpperCase('vi');
}

const PLAIN =
  'flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-night select-none';

/**
 * Ảnh đại diện = vòng tròn với chữ cái đầu của tên (không upload ảnh — M04 Q4).
 * `ring`: viền vàng + quầng sáng thở (trang tài khoản); mặc định: nền vàng đặc (admin)
 */
export function UserAvatar({
  fullName,
  size = 40,
  ring = false,
}: {
  fullName: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={ring ? styles.ring : PLAIN}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {initialOf(fullName)}
    </span>
  );
}
