import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Khôi phục mật khẩu' };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
