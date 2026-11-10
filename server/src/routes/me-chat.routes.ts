import { Router } from 'express';
import * as chatController from '../controllers/chat.controller';
import { requireRole } from '../middlewares/auth';
import { chatLimiter } from '../middlewares/rateLimit';
import { validate } from '../middlewares/validate';
import { chatHistoryQuerySchema, sendChatMessageSchema } from '../schemas/chat.schema';
import { asyncHandler } from '../utils/asyncHandler';

// /api/me/chat (M16) — đã qua requireAuth ở me.routes. Chỉ khách hàng (bắt buộc đăng nhập — Q1)
const router = Router();

router.use(requireRole('CUSTOMER'));

router.get('/', validate({ query: chatHistoryQuerySchema }), asyncHandler(chatController.history));
router.post(
  '/',
  chatLimiter,
  validate({ body: sendChatMessageSchema }),
  asyncHandler(chatController.send),
);
router.delete('/', asyncHandler(chatController.clear));

export default router;
