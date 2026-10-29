import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth';

const router = Router();

// Mọi API dưới /api/admin bắt buộc đăng nhập & vai trò ADMIN
router.use(requireAuth, requireRole('ADMIN'));

export default router;
