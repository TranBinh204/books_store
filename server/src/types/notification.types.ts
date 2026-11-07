// Thông báo cho khách hàng (M13) — docs/03-modules/13-notification.md mục 3.1

export type NotificationType = 'ORDER' | 'PAYMENT' | 'PROMOTION' | 'SYSTEM';

export type NotificationEvent =
  | 'ORDER_PLACED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPING'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'ORDER_EXPIRED'
  | 'ORDER_REFUNDED'
  | 'FLASH_SALE_UPCOMING';

export interface Notification {
  id: number;
  type: NotificationType;
  event: NotificationEvent;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NewNotification {
  userId: number;
  type: NotificationType;
  event: NotificationEvent;
  title: string;
  content: string;
  link: string | null;
  /** Chống gửi trùng (quy tắc 4) — UNIQUE theo (khách, khoá) */
  dedupeKey: string;
}
