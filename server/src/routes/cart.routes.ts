import { Router } from 'express';
import * as cartController from '../controllers/cart.controller';
import { requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import {
  addCartItemSchema,
  bookIdParamSchema,
  cartLinesSchema,
  updateCartItemSchema,
} from '../schemas/cart.schema';
import { asyncHandler } from '../utils/asyncHandler';

/** /api/cart — công khai: xem trước giỏ của khách chưa đăng nhập */
export const publicCartRoutes = Router();

publicCartRoutes.post(
  '/preview',
  validate({ body: cartLinesSchema }),
  asyncHandler(cartController.preview),
);

/** /api/me/cart — giỏ của tài khoản (đã qua requireAuth ở me.routes). Admin không mua hàng */
export const myCartRoutes = Router();

myCartRoutes.use(requireRole('CUSTOMER'));

myCartRoutes.get('/', asyncHandler(cartController.getCart));
myCartRoutes.delete('/', asyncHandler(cartController.clear));
myCartRoutes.post(
  '/merge',
  validate({ body: cartLinesSchema }),
  asyncHandler(cartController.merge),
);
myCartRoutes.post(
  '/items',
  validate({ body: addCartItemSchema }),
  asyncHandler(cartController.addItem),
);
myCartRoutes.patch(
  '/items/:bookId',
  validate({ params: bookIdParamSchema, body: updateCartItemSchema }),
  asyncHandler(cartController.setQuantity),
);
myCartRoutes.delete(
  '/items/:bookId',
  validate({ params: bookIdParamSchema }),
  asyncHandler(cartController.removeItem),
);
