import type { Metadata } from 'next';
import { SessionList } from '@/features/profile';

export const metadata: Metadata = { title: 'Thiết bị đăng nhập' };

export default function SessionsPage() {
  return <SessionList />;
}
