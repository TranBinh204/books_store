import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth';

export const metadata: Metadata = { title: 'Đặt lại mật khẩu' };

export default async function ResetPasswordPage({ searchParams }: PageProps<'/dat-lai-mat-khau'>) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === 'string' ? token : ''} />;
}
