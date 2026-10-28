'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconMenu } from '@/components/ui/icons';
import styles from './Header.module.css';
import { Logo } from './Logo';

/** Menu chính — thêm link khi làm từng module */
const NAV_LINKS: { href: string; label: string }[] = [{ href: '/', label: 'Trang chủ' }];

/**
 * Header cửa hàng Dark Fantasy (bản khung): burger (≤1180) · logo · menu · vùng icon.
 * Module sau bổ sung: mega menu danh mục, ô tìm kiếm, yêu thích / thông báo / tài khoản / giỏ.
 * Dính trên đầu trang, cuộn xuống thì trượt lên ẩn (body.scroll-down).
 */
export function Header() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Chuyển trang thì đóng drawer
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawerOpen(false);
  }, [pathname]);

  // Esc đóng drawer
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <>
      <header className={styles.header}>
        <div className={`wrap ${styles.hd}`}>
          <button
            type="button"
            className={`ic ${styles.burger}`}
            onClick={() => setDrawerOpen(true)}
            aria-label="Mở menu"
            aria-expanded={drawerOpen}
          >
            <IconMenu />
          </button>

          <Logo />

          <nav className={styles.nav} aria-label="Menu chính">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={styles.icons} />
        </div>
      </header>

      <div
        className={styles.drawer}
        data-open={drawerOpen ? '' : undefined}
        onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      >
        <nav className={styles.drawerIn} aria-label="Menu" inert={!drawerOpen}>
          <p className={styles.drawerTitle}>Khám phá</p>
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
