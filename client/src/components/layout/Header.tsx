'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import {
  IconDesktop,
  IconHeart,
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
      <Link href="/dang-nhap">
        <IconUser />
        Đăng nhập / Đăng ký
      </Link>
    );
  }

  return (
    <>
      <div className={styles.drawerUser}>
        <span className={styles.drawerAvatar}>
          {(user.fullName || user.email).charAt(0).toUpperCase()}
        </span>
        <div className={styles.drawerUserMeta}>
          <span className={styles.drawerUserName}>{user.fullName || 'Khách hàng'}</span>
          <span className={styles.drawerUserEmail}>{user.email}</span>
        </div>
      </div>
      <Link href="/tai-khoan">
        <IconUser />
        Thông tin cá nhân
      </Link>
      {user.role === 'CUSTOMER' && (
        <>
          <Link href="/tai-khoan/don-hang">
            <IconReceipt />
            Đơn hàng của tôi
          </Link>
          <Link href="/tai-khoan/yeu-thich">
            <IconHeart />
            Sách yêu thích
          </Link>
        </>
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
        <div className={styles.in}>
          <button
            type="button"
            className={styles.burger}
            onClick={() => setDrawerOpen((prev) => !prev)}
            aria-label={drawerOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={drawerOpen}
          >
            <IconMenu />
          </button>

          <Logo />

          <nav className={styles.nav} aria-label="Điều hướng chính">
            <div className={styles.megaTrigger}>
              <button
                type="button"
                className={styles.megaBtn}
                aria-haspopup="true"
                aria-label="Danh mục sách"
              >
                <span>Danh mục</span>
                <span className={styles.chev}>
                  <IconPlus />
                </span>
              </button>

              <div className={styles.mega} role="region" aria-label="Tất cả danh mục">
                <div className={styles.megaGrid}>
                  {categories.slice(0, MEGA_ROOTS).map((root) => (
                    <div key={root.id} className={styles.col}>
                      <Link href={categoryHref(root.id)} className={styles.rootLink}>
                        <Icon name={root.iconKey} />
                        <span>{root.name}</span>
                      </Link>
                      <ul className={styles.subs}>
                        {root.children.slice(0, MEGA_CHILDREN).map((sub) => (
                          <li key={sub.id}>
                            <Link href={categoryHref(sub.id)}>{sub.name}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
            <Link className="ic" href="/tai-khoan/yeu-thich" aria-label="Sách yêu thích">
              <IconHeart />
            </Link>
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
