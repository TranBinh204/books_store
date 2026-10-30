import { IconCancel, IconCheck } from '@/components/ui/icons';
import { ORDER_STATUS_LABELS } from '../labels';
import type { OrderDetail, OrderStatus } from '../types';
import styles from './OrderProgress.module.css';

const STEPS: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED'];

/**
 * Hành trình đơn: 4 chặng Chờ xác nhận → Đã xác nhận → Đang giao → Đã giao.
 * Đơn huỷ: các chặng đã qua giữ vàng, thêm chặng cuối "Đã huỷ" màu xám.
 */
export function OrderProgress({ order }: { order: Pick<OrderDetail, 'status' | 'history'> }) {
  const cancelled = order.status === 'CANCELLED';
  // Chặng đã từng đi qua (theo nhật ký); đơn chưa huỷ thì lấy theo trạng thái hiện tại
  const reachedIndex = cancelled
    ? Math.max(
        0,
        ...order.history.map((event) => STEPS.indexOf(event.toStatus)).filter((i) => i >= 0),
      )
    : STEPS.indexOf(order.status);

  return (
    <ol className={styles.steps} data-cancelled={cancelled} aria-label="Hành trình đơn hàng">
      {STEPS.map((step, index) => {
        const state =
          index < reachedIndex || (index === reachedIndex && (cancelled || step === 'DELIVERED'))
            ? 'done'
            : index === reachedIndex
              ? 'current'
              : 'todo';
        return (
          <li key={step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className={styles.dot}>
              {state === 'done' ? <IconCheck width="16" height="16" /> : index + 1}
            </span>
            <span className={styles.label}>{ORDER_STATUS_LABELS[step].label}</span>
          </li>
        );
      })}
      {cancelled && (
        <li data-state="cancel">
          <span className={styles.dot}>
            <IconCancel width="18" height="18" />
          </span>
          <span className={styles.label}>{ORDER_STATUS_LABELS.CANCELLED.label}</span>
        </li>
      )}
    </ol>
  );
}
