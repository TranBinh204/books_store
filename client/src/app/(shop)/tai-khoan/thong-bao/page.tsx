import type { Metadata } from 'next';
import { NotificationList } from '@/features/notification';

export const metadata: Metadata = { title: 'Thông báo' };

export default function MyNotificationsPage() {
  return <NotificationList />;
}
