import { Router } from 'express';
import * as voucherController from '../../controllers/admin/voucher.controller';
import { validate } from '../../middlewares/validate';
import { idParamSchema, paginationQuerySchema } from '../../schemas/common.schema';
import {
  adminVoucherQuerySchema,
  createVoucherSchema,
  updateVoucherSchema,
} from '../../schemas/voucher.schema';
import { asyncHandler } from '../../utils/asyncHandler';

// /api/admin/vouchers (M11)
const router = Router();

router.get('/', validate({ query: adminVoucherQuerySchema }), asyncHandler(voucherController.list));
router.post('/', validate({ body: createVoucherSchema }), asyncHandler(voucherController.create));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(voucherController.detail));
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateVoucherSchema }),
  asyncHandler(voucherController.update),
);
router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(voucherController.remove));
router.get(
  '/:id/orders',
  validate({ params: idParamSchema, query: paginationQuerySchema }),
  asyncHandler(voucherController.orders),
);

export default router;
