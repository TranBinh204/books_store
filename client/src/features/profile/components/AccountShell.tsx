'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import type { FunctionComponent, ReactNode, SVGProps } from 'react';
import { Breadcrumb } from '@/components/shop/Breadcrumb';
import {
  IconBell,
  IconDevices,
  IconHeart,
  IconLock,
  IconLogout,
  IconPin,
  IconReceipt,
  IconSparkle,
  IconUser,
} from '@/components/ui/icons';
import { useCurrentUser, useLogout, type CurrentUser } from '@/features/auth';
import { errorMessage } from '@/lib/form';
import styles from './AccountShell.module.css';
import { UserAvatar } from './UserAvatar';

interface NavItem {
  href: string;
  label: string;
  icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  /** Chỉ khách hàng (Admin không mua hàng) */
  customerOnly?: boolean;
}

export const ACCOUNT_NAV: NavItem[] = [
  { href: '/tai-khoan', label: 'Thông tin tài khoản', icon: IconUser },
  { href: '/tai-khoan/dia-chi', label: 'Sổ địa chỉ', icon: IconPin, customerOnly: true },
  { href: '/tai-khoan/don-hang', label: 'Đơn hàng của tôi', icon: IconReceipt, customerOnly: true },
  { href: '/tai-khoan/yeu-thich', label: 'Sách yêu thích', icon: IconHeart, customerOnly: true },
  {
    href: '/tai-khoan/so-thich',
    label: 'Sở thích đọc sách',
    icon: IconSparkle,
    customerOnly: true,
  },
  { href: '/tai-khoan/thong-bao', label: 'Thông báo', icon: IconBell, customerOnly: true },
  { href: '/tai-khoan/doi-mat-khau', label: 'Đổi mật khẩu', icon: IconLock },
  { href: '/tai-khoan/thiet-bi', label: 'Thiết bị đăng nhập', icon: IconDevices },
];

const navFor = (user: CurrentUser) =>
  ACCOUNT_NAV.filter((item) => !item.customerOnly || user.role === 'CUSTOMER');

const isActive = (pathname: string, href: string) =>
  href === '/tai-khoan' ? pathname === href : pathname.startsWith(href);

/**
 * Khung trang "Tài khoản của tôi" (Dark Fantasy):
 * desktop: cột menu trái (avatar + lời chào) · nội dung phải;
 * mobile: menu thành hàng chip cuộn ngang. Bọc trong RequireAuth (layout).
 */
export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  if (!user) return null;
  const items = navFor(user);
  const current = items.find((item) => isActive(pathname, item.href));
  const isSub = current && current.href !== '/tai-khoan';

  const handleLogout = () =>
    logout.mutate(undefined, {
      onSuccess: () => {
        enqueueSnackbar('Đã đăng xuất', { variant: 'info' });
        router.replace('/');
      },
      onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
    });

  return (
    <div className="wrap pb-16">
      <Breadcrumb
        items={[
          isSub ? { label: 'Tài khoản', href: '/tai-khoan' } : { label: 'Tài khoản' },
          ...(isSub ? [{ label: current.label }] : []),
        ]}
      />

      <div className={styles.layout}>
        <aside className={`surface corners ${styles.side}`}>
          <div className={styles.who}>
            <UserAvatar fullName={user.fullName} size={52} ring />
            <div className={styles.name}>
              <span>Xin chào,</span>
              <strong title={user.fullName}>{user.fullName}</strong>
            </div>
          </div>
          <nav aria-label="Menu tài khoản" className={styles.menu}>
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? 'page' : undefined}
              >
                <Icon width="20" height="20" />
                {label}
              </Link>
            ))}
            <button type="button" onClick={handleLogout} disabled={logout.isPending}>
              <IconLogout width="20" height="20" />
              Đăng xuất
            </button>
          </nav>
        </aside>

        <nav aria-label="Menu tài khoản" className={`scroll-x ${styles.tabs}`}>
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="chip chip-soft"
              aria-current={isActive(pathname, href) ? 'page' : undefined}
            >
              <Icon width="16" height="16" />
              {label}
            </Link>
          ))}
        </nav>

        <section className={styles.main}>{children}</section>
      </div>
    </div>
  );
}

/** Khung nội dung 1 trang tài khoản: nhãn chương + tiêu đề (có thể có <em>) + mô tả + thân */
export function AccountPanel({
  chapter,
  title,
  description,
  actions,
  children,
}: {
  /** Nhãn nhỏ phía trên tiêu đề, vd. "Hồ sơ" */
  chapter?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`surface ${styles.panel}`}>
      <div className={styles.head}>
        <div>
          {chapter && <p className={styles.chapter}>✦ {chapter}</p>}
          <h1>{title}</h1>
          {description && <p className={styles.desc}>{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
