import Link from 'next/link';
import { StatusPage } from '@/components/shop/StatusPage';

// 404 trong khu quản trị (vd. notFound() ở trang chi tiết) — hiện trong khung Admin
export default function AdminNotFound() {
  return (
    <StatusPage
      tone="lost"
      code="404"
      chapter="Trang quản trị"
      title={
        <>
          Mục này <em>không tồn tại</em>
        </>
      }
      message="Đường dẫn quản trị bạn mở không có hoặc đối tượng đã bị xoá."
    >
      <Link href="/admin/sach" className="btn btn-gold">
        <span>Về quản lý sách</span>
      </Link>
    </StatusPage>
  );
}
