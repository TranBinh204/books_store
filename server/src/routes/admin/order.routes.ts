import { Router } from 'express';
import * as orderController from '../../controllers/admin/order.controller';
import { validate } from '../../middlewares/validate';
import {
  adminCancelOrderSchema,
  adminOrderListQuerySchema,
  changeOrderStatusSchema,
  refundOrderSchema,
} from '../../schemas/admin-order.schema';
import { idParamSchema } from '../../schemas/common.schema';
import { asyncHandler } from '../../utils/asyncHandler';

// /api/admin/orders (M08)
const router = Router();

router.get('/', validate({ query: adminOrderListQuerySchema }), asyncHandler(orderController.list));
// Khai báo trước '/:id'
router.get('/summary', asyncHandler(orderController.summary));
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(orderController.detail));
router.post(
  '/:id/status',
  validate({ params: idParamSchema, body: changeOrderStatusSchema }),
  asyncHandler(orderController.changeStatus),
);
router.post(
  '/:id/cancel',
  validate({ params: idParamSchema, body: adminCancelOrderSchema }),
  asyncHandler(orderController.cancel),
);
router.post(
  '/:id/refund',
  validate({ params: idParamSchema, body: refundOrderSchema }),
  asyncHandler(orderController.refund),
);

export default router;
