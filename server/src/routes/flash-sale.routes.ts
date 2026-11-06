import { Router } from 'express';
import * as flashSaleController from '../controllers/flash-sale.controller';
import { asyncHandler } from '../utils/asyncHandler';

// /api/flash-sales — công khai (M12)
const router = Router();

router.get('/current', asyncHandler(flashSaleController.current));
router.get('/upcoming', asyncHandler(flashSaleController.upcoming));

export default router;
