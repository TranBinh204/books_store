import { Router } from 'express';
import * as meController from '../controllers/me.controller';
import { requireAuth } from '../middlewares/auth';
import { changePasswordLimiter } from '../middlewares/rateLimit';
import { validate } from '../middlewares/validate';
import { idParamSchema } from '../schemas/common.schema';
import { changePasswordSchema, updateProfileSchema } from '../schemas/profile.schema';
import { asyncHandler } from '../utils/asyncHandler';
import addressRoutes from './address.routes';
import { myCartRoutes } from './cart.routes';
import orderRoutes from './order.routes';

// /api/me — mọi API cần đăng nhập, chỉ thao tác dữ liệu của chính mình (M04)
const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(meController.getProfile));
router.patch(
  '/',
  validate({ body: updateProfileSchema }),
  asyncHandler(meController.updateProfile),
);
router.get('/overview', asyncHandler(meController.getOverview));
router.post(
  '/change-password',
  changePasswordLimiter,
  validate({ body: changePasswordSchema }),
  asyncHandler(meController.changePassword),
);

router.get('/sessions', asyncHandler(meController.listSessions));
// Khai báo trước '/sessions/:id'
router.post('/sessions/revoke-others', asyncHandler(meController.revokeOtherSessions));
router.delete(
  '/sessions/:id',
  validate({ params: idParamSchema }),
  asyncHandler(meController.revokeSession),
);

router.use('/addresses', addressRoutes);
router.use('/cart', myCartRoutes);
router.use('/orders', orderRoutes);

export default router;
