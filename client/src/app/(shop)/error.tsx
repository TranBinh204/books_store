'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { StatusPage } from '@/components/shop/StatusPage';

// Lỗi khi tải trang cửa hàng (mất kết nối server, lỗi 500...) — docs/03-modules/03-catalog.md mục 4.7
export default function ShopError({
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
