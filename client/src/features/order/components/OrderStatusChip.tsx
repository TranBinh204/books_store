import { AdminTag, type AdminTagTone } from '@/components/ui/AdminTag';
import { ORDER_STATUS_LABELS } from '../labels';
import type { OrderStatus } from '../types';
import styles from './OrderStatusChip.module.css';

/** Màu tag trạng thái đơn trong Admin (docs/06-ui-ux/admin/08-don-hang.md mục 3.0) */
const ADMIN_TONE: Record<OrderStatus, AdminTagTone> = {
  PENDING: 'warn',
  CONFIRMED: 'gold',
  SHIPPING: 'info',
  DELIVERED: 'ok',
  CANCELLED: 'muted',
};

/**
 * Nhãn trạng thái đơn. `variant="dark"` cho cửa hàng (Dark Fantasy);
 * mặc định `admin` dùng tag của khu quản trị.
 */
export function OrderStatusChip({
  status,
  variant = 'admin',
}: {
  status: OrderStatus;
  variant?: 'admin' | 'dark';
}) {
  const { label } = ORDER_STATUS_LABELS[status];
  if (variant === 'dark') {
    return (
      <span className={styles.tag} data-status={status}>
        {label}
      </span>
    );
  }
  return <AdminTag tone={ADMIN_TONE[status]}>{label}</AdminTag>;
}
