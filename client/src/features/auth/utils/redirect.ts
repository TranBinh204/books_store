import type { UserRole } from '../types/auth.types';

/**
 * Trang khách hàng được phép quay lại sau khi đăng nhập (`/dang-nhap?next=...`).
 * Danh sách cố định — không nhận đường dẫn tuỳ ý (tránh chuyển hướng ra ngoài). M05 Q4.
 */
const ALLOWED_NEXT = new Set(['/gio-hang', '/tai-khoan/yeu-thich']);
/** Trang chi tiết sách — quay lại sau khi đăng nhập để bấm ♡ (M09 Q2) */
const BOOK_PAGE = /^\/sach\/[1-9]\d{0,9}$/;

/**
 * Trang đích sau khi đăng nhập: Admin → trang quản trị; khách hàng → `next` (nếu được phép)
 * hoặc trang chủ.
 */
export function afterLoginPath(role: UserRole, next?: string | null) {
  if (role === 'ADMIN') return '/admin';
  return next && (ALLOWED_NEXT.has(next) || BOOK_PAGE.test(next)) ? next : '/';
}
