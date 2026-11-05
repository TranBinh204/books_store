import { Router } from 'express';
import * as voucherController from '../controllers/voucher.controller';
import { requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { checkVoucherSchema } from '../schemas/voucher.schema';
import { asyncHandler } from '../utils/asyncHandler';

// /api/me/vouchers — đã qua requireAuth ở me.routes (M11)
const router = Router();

router.use(requireRole('CUSTOMER'));

router.post(
  '/check',
  validate({ body: checkVoucherSchema }),
  asyncHandler(voucherController.check),
);

export default router;
