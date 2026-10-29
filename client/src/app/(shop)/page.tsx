import { Suspense } from 'react';
import { HomeContent, HomeSkeleton } from '@/features/catalog';

// Trang chủ: khung giữ chỗ hiện ngay, nội dung (lấy dữ liệu ở server) đổ vào khi xong
export default function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
