import type { Metadata } from 'next';
import { PublisherManager } from '@/features/admin/named-entities';

export const metadata: Metadata = { title: 'Nhà xuất bản' };

export default function AdminPublishersPage() {
  return <PublisherManager />;
}
