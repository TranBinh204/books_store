import { Router } from 'express';
import * as wishlistController from '../controllers/wishlist.controller';
import { requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { wishlistBookParamSchema, wishlistQuerySchema } from '../schemas/wishlist.schema';
import { asyncHandler } from '../utils/asyncHandler';

// /api/me/wishlist — đã qua requireAuth ở me.routes. Admin không dùng (actors.md)
const router = Router();

router.use(requireRole('CUSTOMER'));

router.get('/', validate({ query: wishlistQuerySchema }), asyncHandler(wishlistController.list));
router.get('/ids', asyncHandler(wishlistController.ids));
router.put(
  '/:bookId',
  validate({ params: wishlistBookParamSchema }),
  asyncHandler(wishlistController.add),
);
router.delete(
  '/:bookId',
  validate({ params: wishlistBookParamSchema }),
  asyncHandler(wishlistController.remove),
);

export default router;
