import type { Metadata } from 'next';
import { ProfileForm } from '@/features/profile';

export const metadata: Metadata = { title: 'Thông tin tài khoản' };

export default function AccountPage() {
  return <ProfileForm />;
}
