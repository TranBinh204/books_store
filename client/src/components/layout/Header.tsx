'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import {
  IconDesktop,
  IconLogout,
  IconMenu,
  IconPlus,
  IconUser,
} from '@/components/ui/icons';
import { AccountMenu, useCurrentUser, useLogout } from '@/features/auth';
import { errorMessage } from '@/lib/form';
import styles from './Header.module.css';
import { Logo } from './Logo';

/** Menu chính — thêm link khi làm từng module */
const NAV_LINKS: { href: string; label: string }[] = [{ href: '/', label: 'Trang chủ' }];

/** Mục tài khoản trong drawer mobile (icon tài khoản ở Header bị ẩn ≤ 640px) */
function DrawerAccount() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: user, isPending } = useCurrentUser();
  const logout = useLogout();
  if (isPending) return null;

  if (!user) {
    return (
      <>
        <p className={styles.drawerTitle}>Tài khoản</p>
        <Link href="/dang-nhap">
          <IconUser />
          Đăng nhập
        </Link>
        <Link href="/dang-ky">
          <IconPlus />
          Đăng ký
        </Link>
      </>
    );
  }

  return (
    <>
      <p className={styles.drawerTitle}>{user.fullName}</p>
      <Link href="/tai-khoan">
        <IconUser />
        Tài khoản của tôi
      </Link>
      {user.role === 'ADMIN' && (
        <Link href="/admin">
          <IconDesktop />
          Trang quản trị
        </Link>
      )}
      <button
        type="button"
        disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, {
            onSuccess: () => {
              enqueueSnackbar('Đã đăng xuất', { variant: 'info' });
              router.replace('/');
            },
            onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
          })
        }
      >
        <IconLogout />
        Đăng xuất
      </button>
    </>
  );
}

/**
 * Header cửa hàng Dark Fantasy (bản Module 01 - Auth): burger (≤1180) · logo · menu · tài khoản.
 * Module sau bổ sung: mega menu danh mục, ô tìm kiếm, yêu thích / thông báo / giỏ hàng.
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

          <div className={styles.icons}>
            <AccountMenu className="ic" />
          </div>
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
          <DrawerAccount />
        </nav>
      </div>
    </>
  );
}