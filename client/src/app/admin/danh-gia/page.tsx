import type { Metadata } from 'next';
import { ReviewTable } from '@/features/admin/reviews';

export const metadata: Metadata = { title: 'Đánh giá' };

export default function AdminReviewsPage() {
  return <ReviewTable />;
}
