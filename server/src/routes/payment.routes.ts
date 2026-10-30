import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { asyncHandler } from '../utils/asyncHandler';

// /api/payments — công khai: VNPay gọi IPN, trang kết quả đọc Return URL (M07).
// Bảo vệ bằng chữ ký HMAC-SHA512, không cần đăng nhập.
const router = Router();

router.get('/methods', asyncHandler(paymentController.methods));
router.get('/vnpay/ipn', asyncHandler(paymentController.vnpayIpn));
router.get('/vnpay/return', asyncHandler(paymentController.vnpayReturn));

export default router;
