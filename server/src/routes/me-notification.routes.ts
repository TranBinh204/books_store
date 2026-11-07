import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { notificationListQuerySchema } from '../schemas/notification.schema';
import { asyncHandler } from '../utils/asyncHandler';

// /api/me/notifications — đã qua requireAuth ở me.routes. Chỉ khách hàng (M13 quy tắc 1)
const router = Router();

router.use(requireRole('CUSTOMER'));

router.get(
  '/',
  validate({ query: notificationListQuerySchema }),
  asyncHandler(notificationController.list),
);
router.get('/unread-count', asyncHandler(notificationController.unreadCount));
router.post('/read-all', asyncHandler(notificationController.markAllRead));
router.post(
  '/:id/read',
  validate({ params: idParamSchema }),
  asyncHandler(notificationController.markRead),
);

export default router;
