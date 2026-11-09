import type { Metadata } from 'next';
import { RequireAuth } from '@/features/auth';
import { RecommendationPage } from '@/features/recommendation';

// Trang cá nhân hoá — không đưa lên công cụ tìm kiếm
export const metadata: Metadata = {
  title: 'Gợi ý sách cho bạn',
  robots: { index: false, follow: false },
};

export default function RecommendationsPage() {
  return (
    <RequireAuth>
      <RecommendationPage />
    </RequireAuth>
  );
}
