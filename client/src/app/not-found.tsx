import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/layout/Logo';
import { StatusPage } from '@/components/ui/StatusPage';

export const metadata: Metadata = {
  title: 'Không tìm thấy trang',
  robots: { index: false, follow: false },
};

/**
 * 404 cho đường dẫn không có. Nằm trong khung gốc nên không có menu / footer cửa hàng:
 * chỉ logo ở đầu (giống khung tối giản của trang Thanh toán).
 */
export default function NotFound() {
  return (
    <>
      <header style={{ padding: '20px 16px', textAlign: 'center' }}>
        <Logo />
      </header>
      <StatusPage
        tone="lost"
        code="404"
        chapter="Lạc lối"
        title={
          <>
            Trang này đã <em>biến mất</em>
          </>
        }
        message="Đường dẫn bạn mở không có trong thư viện của chúng tôi."
      >
        <Link href="/" className="btn btn-gold">
          <span>Về trang chủ</span>
        </Link>
      </StatusPage>
    </>
  );
}
