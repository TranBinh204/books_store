import { Router } from 'express';
import * as authorController from '../controllers/author.controller';
import { validate } from '../middlewares/validate';
import { authorSearchQuerySchema } from '../schemas/author.schema';
import { idParamSchema } from '../schemas/common.schema';
import { asyncHandler } from '../utils/asyncHandler';

// Công khai — không cần đăng nhập
const router = Router();

// Tìm tác giả cho ô chọn "Tác giả yêu thích" (M15)
router.get(
  '/',
  validate({ query: authorSearchQuerySchema }),
  asyncHandler(authorController.search),
);
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(authorController.detail));

export default router;
