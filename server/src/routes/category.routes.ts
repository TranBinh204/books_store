import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { asyncHandler } from '../utils/asyncHandler';

// Công khai — không cần đăng nhập
const router = Router();

router.get('/', asyncHandler(categoryController.tree));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(categoryController.detail));

export default router;
