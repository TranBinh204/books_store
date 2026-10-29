'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { StatusPage } from '@/components/ui/StatusPage';

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
      chapter="Phép thuật trục trặc"
      title={
        <>
          Đã có lỗi <em>xảy ra</em>
        </>
      }
      message="Không tải được trang quản trị này, bạn vui lòng thử lại."
      detail={error.digest ? `Mã lỗi: ${error.digest}` : undefined}
    >
      <button type="button" className="btn btn-gold" onClick={() => retry()}>
        <span>Thử lại</span>
      </button>
      <Link href="/admin" className="btn btn-ghost">
        <span>Về Tổng quan</span>
      </Link>
    </StatusPage>
  );
}

