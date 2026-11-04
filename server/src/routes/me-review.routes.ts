import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import {
  bookIdParamSchema,
  createReviewSchema,
  updateReviewSchema,
} from '../schemas/review.schema';
import { asyncHandler } from '../utils/asyncHandler';

// Đánh giá của khách hàng (M10) — gắn vào /api/me (đã qua requireAuth)
const router = Router();
const customer = requireRole('CUSTOMER');

router.post(
  '/reviews',
  customer,
  validate({ body: createReviewSchema }),
  asyncHandler(reviewController.create),
);
router.patch(
  '/reviews/:id',
  customer,
  validate({ params: idParamSchema, body: updateReviewSchema }),
  asyncHandler(reviewController.update),
);
// Nút Viết / Sửa đánh giá ở trang sách
router.get(
  '/books/:bookId/review-status',
  customer,
  validate({ params: bookIdParamSchema }),
  asyncHandler(reviewController.statusForBook),
);
// Nút đánh giá từng sách ở chi tiết đơn
router.get(
  '/orders/:id/reviews',
  customer,
  validate({ params: idParamSchema }),
  asyncHandler(reviewController.listMineByOrder),
);

export default router;
