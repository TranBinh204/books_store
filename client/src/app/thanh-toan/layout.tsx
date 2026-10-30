import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';
import styles from './CheckoutLayout.module.css';

export const metadata: Metadata = {
  title: 'Thanh toán',
  robots: { index: false, follow: false },
};

/**
 * Trang thanh toán dùng giao diện TỐI GIẢN như checkout Haravan của azvietnam (M06 Q2):
 * chỉ logo + đường dẫn, không menu / footer cửa hàng → khách tập trung hoàn tất đơn.
 */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <div className={`wrap ${styles.topInner}`}>
          <Logo />
          <span className={styles.secure}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="5" y="11" width="14" height="9" rx="1.5" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            Thanh toán an toàn
          </span>
        </div>
      </header>
      <nav aria-label="Đường dẫn" className={`wrap ${styles.steps}`}>
        <Link href="/gio-hang">Giỏ hàng</Link>
        <span aria-hidden="true">✦</span>
        <span aria-current="page">Thanh toán</span>
      </nav>
      <main className={styles.main}>{children}</main>
      <footer className={styles.foot}>
        © {new Date().getFullYear()} BookStore · Miễn phí giao hàng toàn quốc
      </footer>
    </div>
  );
}
