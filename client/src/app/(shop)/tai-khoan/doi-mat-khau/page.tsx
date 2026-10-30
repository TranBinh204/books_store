import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/features/profile';

export const metadata: Metadata = { title: 'Đổi mật khẩu' };

export default function ChangePasswordPage() {
  return <ChangePasswordForm />;
}
