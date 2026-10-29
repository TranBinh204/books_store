import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './SectionTitle.module.css';

interface SectionTitleProps {
  /** Nhãn chương có gạch hoa văn, vd "Chương II · Flash Sale" (trang chức năng: tên thật) */
  chapter?: string;
  /** Tiêu đề — phần nhấn bọc <em>: <>Lời nguyền <em>nửa đêm</em></> */
  title: ReactNode;
  subtitle?: ReactNode;
  /** `curse`: phần nhấn màu lửa (khối Flash Sale) */
  tone?: 'default' | 'curse';
  /** Link "Xem tất cả" dưới tiêu đề */
  action?: { href: string; label: string };
  /** Cỡ nhỏ hơn cho trang chức năng */
  compact?: boolean;
  /** Thêm nội dung trên nhãn chương (vd. 3 ngọn nến) */
  before?: ReactNode;
}

/** Tiêu đề khối căn giữa, hiện dần khi cuộn tới — components.md 2.5 */
export function SectionTitle({
  chapter,
  title,
  subtitle,
  tone = 'default',
  action,
  compact = false,
  before,
}: SectionTitleProps) {
  return (
    <div
      className={`${styles.hd} ${tone === 'curse' ? styles.curse : ''} ${compact ? styles.compact : ''}`}
      data-reveal
    >
      {before}
      {chapter && <p className="orn">{chapter}</p>}
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
      {action && (
        <div className={styles.action}>
          <Link href={action.href} className="more">
            {action.label} →
          </Link>
        </div>
      )}
    </div>
  );
}
