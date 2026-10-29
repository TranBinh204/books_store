import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { validate } from '../middlewares/validate';
import { suggestionQuerySchema } from '../schemas/book-public.schema';
import { asyncHandler } from '../utils/asyncHandler';

// Công khai — không cần đăng nhập
const router = Router();

router.get(
  '/suggestions',
  validate({ query: suggestionQuerySchema }),
  asyncHandler(searchController.suggestions),
);

export default router;
