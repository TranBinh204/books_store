import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import * as paymentController from '../controllers/payment.controller';
import { requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  cancelOrderSchema,
  createOrderSchema,
  orderIdParamSchema,
  orderListQuerySchema,
} from '../schemas/order.schema';
import { asyncHandler } from '../utils/asyncHandler';

// /api/me/orders — đã qua requireAuth ở me.routes. Admin không mua hàng (xử lý đơn ở M08)
const router = Router();

router.use(requireRole('CUSTOMER'));

router.get('/', validate({ query: orderListQuerySchema }), asyncHandler(orderController.list));
router.post('/', validate({ body: createOrderSchema }), asyncHandler(orderController.create));
// Khai báo trước '/:id'
router.get('/summary', asyncHandler(orderController.summary));
router.get('/:id', validate({ params: orderIdParamSchema }), asyncHandler(orderController.detail));
router.post(
  '/:id/cancel',
  validate({ params: orderIdParamSchema, body: cancelOrderSchema }),
  asyncHandler(orderController.cancel),
);
// Tạo lượt thử + link thanh toán VNPay (M07)
router.post(
  '/:id/vnpay',
  validate({ params: orderIdParamSchema }),
  asyncHandler(paymentController.createVnpayPayment),
);

export default router;
