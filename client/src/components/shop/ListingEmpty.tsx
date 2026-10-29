import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import styles from './ListingEmpty.module.css';

/** Trạng thái rỗng của trang danh sách (không có sách / không khớp bộ lọc): icon mờ + câu + 1 nút */
export function ListingEmpty({
  icon,
  message,
  action,
}: {
  /** Khóa icon danh mục; bỏ qua → icon sách */
  icon?: string | null;
  message: string;
  action: { href: string; label: string; variant: 'gold' | 'ghost' };
}) {
  return (
    <div className={`surface ${styles.empty}`}>
      <Icon name={icon} />
      <p>{message}</p>
      <Link href={action.href} className={`btn btn-${action.variant}`}>
        {action.label}
      </Link>
    </div>
  );
}
