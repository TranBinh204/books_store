import { Router } from 'express';
import * as categoryController from '../../controllers/admin/category.controller';
import { validate } from '../../middlewares/validate';
import { createCategorySchema, updateCategorySchema } from '../../schemas/category.schema';
import { idParamSchema } from '../../schemas/common.schema';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(categoryController.list));
router.post('/', validate({ body: createCategorySchema }), asyncHandler(categoryController.create));
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateCategorySchema }),
  asyncHandler(categoryController.update),
);
router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(categoryController.remove));

export default router;
