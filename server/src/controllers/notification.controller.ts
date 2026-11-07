import type { Request, Response } from 'express';
import type { NotificationListQuery } from '../schemas/notification.schema';
import * as notificationService from '../services/notification.service';
import { sendSuccess } from '../utils/response';

// /api/me/notifications (M13)

export async function list(req: Request, res: Response) {
  const { items, meta } = await notificationService.listMine(
    req.user!.id,
    req.query as unknown as NotificationListQuery,
  );
  return sendSuccess(res, items, 200, meta);
}

export async function unreadCount(req: Request, res: Response) {
  return sendSuccess(res, { count: await notificationService.countUnread(req.user!.id) });
}

export async function markRead(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };
  await notificationService.markRead(req.user!.id, id);
  return res.status(204).end();
}

export async function markAllRead(req: Request, res: Response) {
  return sendSuccess(res, { updated: await notificationService.markAllRead(req.user!.id) });
}
