'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import {
  IconDesktop,
  IconLogout,
  IconMenu,
  IconPlus,
  IconReceipt,
  IconUser,
} from '@/components/ui/icons';
import { AccountMenu, useCurrentUser, useLogout } from '@/features/auth';
import { categoryHref, type PublicCategoryNode } from '@/features/catalog';
import { errorMessage } from '@/lib/form';
import { CartButton } from './CartButton';
import styles from './Header.module.css';
import { Logo } from './Logo';
import { SearchBox } from './SearchBox';

/** Mega menu: 10 danh mục đầu, mỗi danh mục 3 danh mục con — demo 07 */
const MEGA_ROOTS = 10;
const MEGA_CHILDREN = 3;

/** Menu chính */
const NAV_LINKS = [
  { href: '/tim-kiem', label: 'Tất cả sách' },
  { href: '/#legends', label: 'Truyền thuyết' },
  { href: '/tim-kiem?sort=sold_desc', label: 'Bán chạy' },
  { href: '/tim-kiem?sort=created_desc', label: 'Sách mới' },
];

/** Link nhanh đầu drawer mobile */
const DRAWER_LINKS = [
  { href: '/tim-kiem', label: 'Tất cả sách' },
  { href: '/tim-kiem?sort=created_desc', label: 'Sách mới' },
  ...NAV_LINKS.slice(1),
];

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
      {user.role === 'CUSTOMER' && (
        <Link href="/tai-khoan/don-hang">
          <IconReceipt />
          Đơn hàng của tôi
        </Link>
      )}
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
 * Header cửa hàng Dark Fantasy (components.md 2.1):
 * burger (≤1180) · logo · menu + mega menu danh mục · ô tìm kiếm · tài khoản.
 * Dính trên đầu trang, cuộn xuống thì trượt lên ẩn (body.scroll-down).
 */
export function Header({ categories = [] }: { categories?: PublicCategoryNode[] }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Chuyển trang thì đóng drawer
  useEffect(() => {
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
            aria-label="Mở menu danh mục"
            aria-expanded={drawerOpen}
          >
            <IconMenu />
          </button>

          <Logo />

          <nav className={styles.nav} aria-label="Menu chính">
            <div className={styles.hasMega}>
              <Link href="/tim-kiem" aria-haspopup="true">
                Vương quốc ▾
              </Link>
              <div className={styles.mega}>
                <div className={`wrap ${styles.megaIn}`}>
                  {categories.slice(0, MEGA_ROOTS).map((root) => (
                    <div key={root.id}>
                      <h4>
                        <Icon name={root.iconKey} />
                        <Link href={categoryHref(root.id)}>{root.name}</Link>
                      </h4>
                      <ul>
                        {root.children.slice(0, MEGA_CHILDREN).map((child) => (
                          <li key={child.id}>
                            <Link href={categoryHref(child.id)}>{child.name}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <Link href="/tim-kiem" className={styles.megaAll}>
                    Xem tất cả vương quốc →
                  </Link>
                </div>
              </div>
            </div>
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

          <SearchBox />

          <div className={styles.icons}>
            <AccountMenu className="ic" />
            <CartButton className={`ic ${styles.keepMobile}`} />
          </div>
        </div>
      </header>

      <div
        className={styles.drawer}
        data-open={drawerOpen ? '' : undefined}
        onClick={(e) => e.target === e.currentTarget && setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      >
        <nav className={styles.drawerIn} aria-label="Danh mục sách" inert={!drawerOpen}>
          <p className={styles.drawerTitle}>Khám phá</p>
          {DRAWER_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <DrawerAccount />
          <p className={styles.drawerTitle}>Vương quốc</p>
          {categories.map((root) => (
            <Link key={root.id} href={categoryHref(root.id)}>
              <Icon name={root.iconKey} />
              {root.name}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
