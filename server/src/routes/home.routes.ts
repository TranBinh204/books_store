import { Router } from 'express';
import * as homeController from '../controllers/home.controller';
import { asyncHandler } from '../utils/asyncHandler';

// Công khai — dữ liệu trang chủ (docs/06-ui-ux/shop/01-trang-chu.md A8)
const router = Router();

router.get('/', asyncHandler(homeController.get));

export default router;
