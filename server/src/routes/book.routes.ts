import { Router } from 'express';
import * as bookController from '../controllers/book.controller';
import * as reviewController from '../controllers/review.controller';
import { validate } from '../middlewares/validate';
import { bookFacetQuerySchema, publicBookListQuerySchema } from '../schemas/book-public.schema';
import { idParamSchema } from '../schemas/common.schema';
import { publicReviewQuerySchema } from '../schemas/review.schema';
import { asyncHandler } from '../utils/asyncHandler';

// Công khai — không cần đăng nhập
const router = Router();

router.get('/', validate({ query: publicBookListQuerySchema }), asyncHandler(bookController.list));
// Khai báo trước '/:id' để "facets" không bị hiểu là id
router.get(
  '/facets',
  validate({ query: bookFacetQuerySchema }),
  asyncHandler(bookController.facets),
);
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(bookController.detail));
router.get(
  '/:id/related',
  validate({ params: idParamSchema }),
  asyncHandler(bookController.related),
);
// Đánh giá (M10)
router.get(
  '/:id/reviews/summary',
  validate({ params: idParamSchema }),
  asyncHandler(reviewController.summary),
);
router.get(
  '/:id/reviews',
  validate({ params: idParamSchema, query: publicReviewQuerySchema }),
  asyncHandler(reviewController.listPublic),
);

export default router;
