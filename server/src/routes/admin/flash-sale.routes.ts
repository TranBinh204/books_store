import { Router } from 'express';
import * as flashSaleController from '../../controllers/admin/flash-sale.controller';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../schemas/common.schema';
import { adminFlashSaleQuerySchema, flashSaleBodySchema } from '../../schemas/flash-sale.schema';
import { asyncHandler } from '../../utils/asyncHandler';

// /api/admin/flash-sales (M12)
const router = Router();

router.get(
  '/',
  validate({ query: adminFlashSaleQuerySchema }),
  asyncHandler(flashSaleController.list),
);
router.post('/', validate({ body: flashSaleBodySchema }), asyncHandler(flashSaleController.create));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(flashSaleController.detail));
router.put(
  '/:id',
  validate({ params: idParamSchema, body: flashSaleBodySchema }),
  asyncHandler(flashSaleController.update),
);
router.post(
  '/:id/stop',
  validate({ params: idParamSchema }),
  asyncHandler(flashSaleController.stop),
);
router.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(flashSaleController.remove),
);

export default router;
