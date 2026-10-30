import { Router } from 'express';
import * as addressController from '../controllers/address.controller';
import { requireRole } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { addressSchema } from '../schemas/address.schema';
import { idParamSchema } from '../schemas/common.schema';
import { asyncHandler } from '../utils/asyncHandler';

// /api/me/addresses — đã qua requireAuth ở me.routes. Admin không mua hàng → không có sổ địa chỉ
const router = Router();

router.use(requireRole('CUSTOMER'));

router.get('/', asyncHandler(addressController.list));
router.post('/', validate({ body: addressSchema }), asyncHandler(addressController.create));
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: addressSchema }),
  asyncHandler(addressController.update),
);
router.put(
  '/:id/default',
  validate({ params: idParamSchema }),
  asyncHandler(addressController.setDefault),
);
router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(addressController.remove));

export default router;
