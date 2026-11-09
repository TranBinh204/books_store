import { Router } from 'express';
import * as preferenceController from '../controllers/preference.controller';
import * as recommendationController from '../controllers/recommendation.controller';
import { requireRole } from '../middlewares/auth';
import { recommendRefreshLimiter } from '../middlewares/rateLimit';
import { validate } from '../middlewares/validate';
import { savePreferencesSchema } from '../schemas/preference.schema';
import { asyncHandler } from '../utils/asyncHandler';

// /api/me/preferences, /api/me/recommendations (M15) — đã qua requireAuth ở me.routes. Chỉ khách hàng
const router = Router();

router.use(requireRole('CUSTOMER'));

router.get('/preferences', asyncHandler(preferenceController.get));
router.put(
  '/preferences',
  validate({ body: savePreferencesSchema }),
  asyncHandler(preferenceController.save),
);
router.post('/preferences/skip', asyncHandler(preferenceController.skip));

router.get('/recommendations', asyncHandler(recommendationController.get));
router.post(
  '/recommendations/refresh',
  recommendRefreshLimiter,
  asyncHandler(recommendationController.refresh),
);

export default router;
