import { Router } from 'express';
import * as bookController from '../../controllers/admin/book.controller';
import { validate } from '../../middlewares/validate';
import {
  bookListQuerySchema,
  bookStatusSchema,
  createBookSchema,
  updateBookSchema,
} from '../../schemas/book.schema';
import { idParamSchema } from '../../schemas/common.schema';
import { changeStockSchema } from '../../schemas/inventory.schema';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/', validate({ query: bookListQuerySchema }), asyncHandler(bookController.list));
router.post('/', validate({ body: createBookSchema }), asyncHandler(bookController.create));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(bookController.detail));
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateBookSchema }),
  asyncHandler(bookController.update),
);
router.patch(
  '/:id/status',
  validate({ params: idParamSchema, body: bookStatusSchema }),
  asyncHandler(bookController.setStatus),
);
router.post(
  '/:id/stock',
  validate({ params: idParamSchema, body: changeStockSchema }),
  asyncHandler(bookController.changeStock),
);

export default router;
