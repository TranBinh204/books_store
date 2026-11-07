import { http } from '@/lib/http';
import type { AppNotification } from '../types';

export async function listNotifications(params: { unread?: boolean; page: number; limit: number }) {
  const { data, meta } = await http.get<AppNotification[]>('/me/notifications', {
    query: { ...params, unread: params.unread ? 'true' : undefined },
  });
  return { items: data, meta };
}

export async function getUnreadCount() {
  return (await http.get<{ count: number }>('/me/notifications/unread-count')).data.count;
}

export async function markRead(id: number) {
  await http.post(`/me/notifications/${id}/read`);
}

export async function markAllRead() {
  return (await http.post<{ updated: number }>('/me/notifications/read-all')).data.updated;
}
