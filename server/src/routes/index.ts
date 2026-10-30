import { Router } from 'express';
import adminRoutes from './admin';
import authorRoutes from './author.routes';
import authRoutes from './auth.routes';
import bookRoutes from './book.routes';
import categoryRoutes from './category.routes';
import healthRoutes from './health.routes';
import homeRoutes from './home.routes';
import meRoutes from './me.routes';
import searchRoutes from './search.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Tài khoản cá nhân — cần đăng nhập (M04)
router.use('/me', meRoutes);

// Cửa hàng — công khai (M03)
// Trang chủ Dark Fantasy: gom dữ liệu 1 lần
router.use('/home', homeRoutes);
router.use('/categories', categoryRoutes);
router.use('/books', bookRoutes);
router.use('/authors', authorRoutes);
router.use('/search', searchRoutes);

router.use('/admin', adminRoutes);

export default router;
