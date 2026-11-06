import { Router } from 'express';
import * as inventoryController from '../../controllers/admin/inventory.controller';
import * as uploadController from '../../controllers/admin/upload.controller';
import { requireAuth, requireRole } from '../../middlewares/auth';
import { uploadImages } from '../../middlewares/upload';
import { validate } from '../../middlewares/validate';
import { inventoryLogQuerySchema } from '../../schemas/inventory.schema';
import { asyncHandler } from '../../utils/asyncHandler';
import bookRoutes from './book.routes';
import categoryRoutes from './category.routes';
import customerRoutes from './customer.routes';
import flashSaleRoutes from './flash-sale.routes';
import { authorRoutes, publisherRoutes } from './named-entity.routes';
import orderRoutes from './order.routes';
import reviewRoutes from './review.routes';
import voucherRoutes from './voucher.routes';

const router = Router();

// Mọi API dưới /api/admin bắt buộc đăng nhập & vai trò ADMIN
router.use(requireAuth, requireRole('ADMIN'));

router.use('/categories', categoryRoutes);
router.use('/authors', authorRoutes);
router.use('/publishers', publisherRoutes);
router.use('/books', bookRoutes);

// Đơn hàng & khách hàng (M08)
router.use('/orders', orderRoutes);
router.use('/customers', customerRoutes);

// Đánh giá (M10)
router.use('/reviews', reviewRoutes);

// Voucher (M11)
router.use('/vouchers', voucherRoutes);
// Flash sale (M12)
router.use('/flash-sales', flashSaleRoutes);

router.post('/uploads/images', uploadImages, asyncHandler(uploadController.uploadImages));
router.get(
  '/inventory-logs',
  validate({ query: inventoryLogQuerySchema }),
  asyncHandler(inventoryController.listLogs),
);

export default router;
