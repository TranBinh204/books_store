import type { Metadata } from 'next';

// Trang tài khoản không cần xuất hiện trên công cụ tìm kiếm
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
