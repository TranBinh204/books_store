'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { StatusPage } from '@/components/shop/StatusPage';

// Lỗi khi tải một trang quản trị — hiện trong khung Admin (sidebar + thanh trên vẫn còn)
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      tone="error"
      code="Lỗi"
      chapter="Trang quản trị"
      title={
        <>
          Không tải được <em>dữ liệu</em>
        </>
      }
      message="Không lấy được dữ liệu quản trị, bạn vui lòng thử lại sau ít phút."
      detail={error.digest ? `Mã lỗi: ${error.digest}` : undefined}
    >
      <button type="button" className="btn btn-gold" onClick={() => retry()}>
        <span>Thử lại</span>
      </button>
      <Link href="/admin/sach" className="btn btn-ghost">
        <span>Về quản lý sách</span>
      </Link>
    </StatusPage>
  );
}
