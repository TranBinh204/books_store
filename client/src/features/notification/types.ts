// Thông báo (M13) — khớp server/src/types/notification.types.ts

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

export interface AppNotification {
  id: number;
  type: NotificationType;
  event: NotificationEvent;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}
