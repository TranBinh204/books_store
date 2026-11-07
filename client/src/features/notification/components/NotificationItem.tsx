'use client';

import { useRouter } from 'next/navigation';
import type { FunctionComponent, SVGProps } from 'react';
import {
  IconAlert,
  IconBolt,
  IconCancel,
  IconCard,
  IconCheck,
  IconReceipt,
  IconTruck,
} from '@/components/ui/icons';
import { formatRelativeTime } from '@/lib/format';
import { useMarkRead } from '../hooks/useNotifications';
import type { AppNotification, NotificationEvent } from '../types';
import styles from './NotificationItem.module.css';

type Tone = 'gold' | 'ok' | 'fail' | 'muted';

const ICONS: Record<
  NotificationEvent,
  { icon: FunctionComponent<SVGProps<SVGSVGElement>>; tone: Tone }
> = {
  ORDER_PLACED: { icon: IconReceipt, tone: 'gold' },
  PAYMENT_SUCCESS: { icon: IconCard, tone: 'ok' },
  PAYMENT_FAILED: { icon: IconAlert, tone: 'fail' },
  ORDER_CONFIRMED: { icon: IconCheck, tone: 'gold' },
  ORDER_SHIPPING: { icon: IconTruck, tone: 'gold' },
  ORDER_DELIVERED: { icon: IconCheck, tone: 'ok' },
  ORDER_CANCELLED: { icon: IconCancel, tone: 'muted' },
  ORDER_EXPIRED: { icon: IconCancel, tone: 'muted' },
  ORDER_REFUNDED: { icon: IconCard, tone: 'ok' },
  FLASH_SALE_UPCOMING: { icon: IconBolt, tone: 'fail' },
};

/**
 * 1 thông báo (hộp thả xuống & trang Thông báo): biểu tượng theo sự kiện · tiêu đề (đậm khi chưa đọc)
 * · nội dung · thời gian · chấm vàng. Bấm → đánh dấu đã đọc rồi tới đường dẫn (quy tắc 5).
 */
export function NotificationItem({
  notification,
  compact = false,
  onNavigate,
}: {
  notification: AppNotification;
  /** Hộp thả xuống: nội dung 2 dòng */
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const markRead = useMarkRead();
  const { icon: Icon, tone } = ICONS[notification.event] ?? ICONS.ORDER_PLACED;

  const open = () => {
    if (!notification.isRead) markRead.mutate(notification.id);
    onNavigate?.();
    if (notification.link) router.push(notification.link);
  };

  return (
    <button
      type="button"
      onClick={open}
      className={styles.item}
      data-unread={!notification.isRead}
      data-compact={compact}
    >
      <span className={styles.icon} data-tone={tone}>
        <Icon width="20" height="20" />
      </span>
      <span className={styles.text}>
        <span className={styles.title}>{notification.title}</span>
        <span className={styles.content}>{notification.content}</span>
        <span className={styles.time}>{formatRelativeTime(notification.createdAt)}</span>
      </span>
      {!notification.isRead && <span className={styles.dot} aria-label="Chưa đọc" />}
    </button>
  );
}
