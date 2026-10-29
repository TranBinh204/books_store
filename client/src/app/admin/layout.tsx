import type { Metadata } from 'next';
import { AdminShell } from '@/components/layout/admin/AdminShell';
import { RequireRole } from '@/features/auth';

export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s | Quản trị BookStore' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <RequireRole role="ADMIN">
      <AdminShell>{children}</AdminShell>
    </RequireRole>
  );
}
