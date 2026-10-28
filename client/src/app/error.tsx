'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { StatusPage } from '@/components/ui/StatusPage';

// Lỗi ngoài khu cửa hàng (Thanh toán, Admin...) — bọc trong khung gốc nên không có menu cửa hàng
export default function AppError({
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
      message="Không tải được nội dung, bạn vui lòng thử lại sau ít phút."
      detail={error.digest ? `Mã lỗi: ${error.digest}` : undefined}
    >
      <button type="button" className="btn btn-gold" onClick={() => retry()}>
        <span>Thử lại</span>
      </button>
      <Link href="/" className="btn btn-ghost">
        <span>Về trang chủ</span>
      </Link>
    </StatusPage>
  );
}
