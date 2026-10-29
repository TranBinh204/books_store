import Link from 'next/link';
import { StatusPage } from './StatusPage';

/** Trang 404 của cửa hàng: sách / danh mục không tồn tại hoặc đang ẩn */
export function NotFoundView({ title, message }: { title: string; message: string }) {
  return (
    <StatusPage tone="lost" code="404" chapter="Lạc lối" title={title} message={message} showSearch>
      <Link href="/" className="btn btn-gold">
        <span>Về trang chủ</span>
      </Link>
      <Link href="/tim-kiem?sort=created_desc" className="btn btn-ghost">
        <span>Xem sách mới</span>
      </Link>
    </StatusPage>
  );
}
