import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth';
import {
  forgotPasswordLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  registerResendLimiter,
  registerVerifyLimiter,
  resetPasswordLimiter,
} from '../middlewares/rateLimit';
import { validate } from '../middlewares/validate';
import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resendRegisterOtpSchema,
  resetPasswordSchema,
  verifyRegisterSchema,
  verifyResetTokenSchema,
} from '../schemas/auth.schema';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/register',
  registerLimiter,
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);
router.post(
  '/register/verify',
  registerVerifyLimiter,
  validate({ body: verifyRegisterSchema }),
  asyncHandler(authController.verifyRegister),
);
router.post(
  '/register/resend',
  registerResendLimiter,
  validate({ body: resendRegisterOtpSchema }),
  asyncHandler(authController.resendRegisterOtp),
);
router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);
router.post(
  '/refresh',
  refreshLimiter,
  validate({ body: refreshTokenSchema }),
  asyncHandler(authController.refresh),
);
router.post('/logout', validate({ body: logoutSchema }), asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  asyncHandler(authController.forgotPassword),
);
router.get(
  '/reset-password/verify',
  validate({ query: verifyResetTokenSchema }),
  asyncHandler(authController.verifyResetToken),
);
router.post(
  '/reset-password',
  resetPasswordLimiter,
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);

export default router;
