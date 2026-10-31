import { Router } from 'express';
import * as customerController from '../../controllers/admin/customer.controller';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../../schemas/common.schema';
import { customerListQuerySchema, lockCustomerSchema } from '../../schemas/customer.schema';
import { asyncHandler } from '../../utils/asyncHandler';

// /api/admin/customers (M08)
const router = Router();

router.get(
  '/',
  validate({ query: customerListQuerySchema }),
  asyncHandler(customerController.list),
);
router.get('/:id', validate({ params: idParamSchema }), asyncHandler(customerController.detail));
router.post(
  '/:id/lock',
  validate({ params: idParamSchema, body: lockCustomerSchema }),
  asyncHandler(customerController.lock),
);
router.post(
  '/:id/unlock',
  validate({ params: idParamSchema }),
  asyncHandler(customerController.unlock),
);

export default router;
