import { Router } from 'express';
import * as voucherController from '../controllers/voucher.controller';
import { asyncHandler } from '../utils/asyncHandler';

// /api/vouchers — công khai (M11)
const router = Router();

router.get('/', asyncHandler(voucherController.listPublic));

export default router;
