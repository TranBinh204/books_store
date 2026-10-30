import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RequireAuth } from '@/features/auth';
import { AccountShell } from '@/features/profile';

// Trang cá nhân — không đưa lên công cụ tìm kiếm
export const metadata: Metadata = {
  title: { default: 'Tài khoản của tôi', template: '%s | Tài khoản | BookStore' },
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AccountShell>{children}</AccountShell>
    </RequireAuth>
  );
}
