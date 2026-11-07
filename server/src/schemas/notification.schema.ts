import { z } from 'zod';

// Thông báo (M13)

export const notificationListQuerySchema = z.object({
  /** true → chỉ thông báo chưa đọc */
  unread: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
