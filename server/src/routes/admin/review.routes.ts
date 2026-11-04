import { Router } from 'express';
import * as reviewController from '../../controllers/admin/review.controller';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../schemas/common.schema';
import { adminReviewQuerySchema, hideReviewSchema } from '../../schemas/review.schema';
import { asyncHandler } from '../../utils/asyncHandler';

// /api/admin/reviews (M10)
const router = Router();

router.get('/', validate({ query: adminReviewQuerySchema }), asyncHandler(reviewController.list));
router.post(
  '/:id/hide',
  validate({ params: idParamSchema, body: hideReviewSchema }),
  asyncHandler(reviewController.hide),
);
router.post(
  '/:id/unhide',
  validate({ params: idParamSchema }),
  asyncHandler(reviewController.unhide),
);

export default router;
