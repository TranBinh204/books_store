import Link from 'next/link';
import { StatusPage } from '@/components/ui/StatusPage';

// 404 trong khu quản trị (vd. notFound() ở trang chi tiết) — hiện trong khung Admin
export default function AdminNotFound() {
  return (
    <StatusPage
      tone="lost"
      code="404"
      chapter="Lạc lối"
      title={
        <>
          Không tìm thấy <em>trang này</em>
        </>
      }
      message="Đường dẫn quản trị bạn mở không tồn tại hoặc dữ liệu đã bị xoá."
    >
      <Link href="/admin" className="btn btn-gold">
        <span>Về Tổng quan</span>
      </Link>
    </StatusPage>
  );
}

