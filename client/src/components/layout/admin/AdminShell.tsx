'use client';

import { Drawer, Tooltip } from '@mui/material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { HoverMenu } from '@/components/ui/HoverMenu';
import {
  IconBolt,
  IconBook,
  IconBuilding,
  IconCategory,
  IconCollapse,
  IconDashboard,
  IconInventory,
  IconLogout,
  IconMenu,
  IconReceipt,
  IconReview,
  IconStore,
  IconUser,
  IconUsers,
  IconVoucher,
} from '@/components/ui/icons';
import { useAdminOrderCounts } from '@/features/admin/orders';
import { useCurrentUser, useLogout } from '@/features/auth';
import { errorMessage } from '@/lib/form';
import { UserAvatar } from '@/features/profile';
import styles from './AdminShell.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Tổng quan',
    items: [{ href: '/admin', label: 'Tổng quan', icon: IconDashboard }],
  },
  {
    title: 'Sản phẩm',
    items: [
      { href: '/admin/sach', label: 'Sách', icon: IconBook },
      { href: '/admin/danh-muc', label: 'Danh mục', icon: IconCategory },
      { href: '/admin/tac-gia', label: 'Tác giả', icon: IconUser },
      { href: '/admin/nha-xuat-ban', label: 'Nhà xuất bản', icon: IconBuilding },
      { href: '/admin/ton-kho', label: 'Lịch sử tồn kho', icon: IconInventory },
    ],
  },
  {
    title: 'Bán hàng',
    items: [
      { href: '/admin/don-hang', label: 'Đơn hàng', icon: IconReceipt },
      { href: '/admin/khach-hang', label: 'Khách hàng', icon: IconUsers },
      { href: '/admin/danh-gia', label: 'Đánh giá', icon: IconReview },
      { href: '/admin/voucher', label: 'Voucher', icon: IconVoucher },
      { href: '/admin/flash-sale', label: 'Flash Sale', icon: IconBolt },
    ],
  },
];

const SIDEBAR_WIDTH = 260;
/** Thu gọn: chỉ còn icon (rê chuột → hiện tên mục) */
const SIDEBAR_COLLAPSED_WIDTH = 68;

// Nhớ trạng thái thu gọn trên trình duyệt này (tiện ích cá nhân — lỗi storage thì bỏ qua)
const COLLAPSED_KEY = 'admin-sidebar-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    // Trình duyệt chặn storage → chỉ không nhớ được, vẫn dùng bình thường
  }
}

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

function SidebarContent({
  collapsed = false,
  onNavigate,
}: {
  /** Chỉ hiện icon (desktop thu gọn) */
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  // Badge số đơn Chờ xác nhận ở mục Đơn hàng (M08 Q11) — tự cập nhật 60 giây
  const pendingOrders = useAdminOrderCounts().data?.PENDING ?? 0;
  const badgeOf = (href: string) => (href === '/admin/don-hang' ? pendingOrders : 0);

  return (
    <nav
      aria-label="Menu quản trị"
      className={`${styles.nav} ${collapsed ? styles.collapsed : ''}`}
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
    >
      <Link
        href="/admin"
        onClick={onNavigate}
        aria-label="BookStore Quản trị – Tổng quan"
        className={styles.brand}
      >
        <b>{collapsed ? 'B' : 'BookStore'}</b>
        {!collapsed && <small>Quản trị</small>}
      </Link>

      <div className={styles.scroll}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className={styles.group}>
            {collapsed ? (
              <div className={styles.groupLine} aria-hidden />
            ) : (
              <div className={styles.groupTitle}>{group.title}</div>
            )}
            {group.items.map(({ href, label, icon: Icon }) => {
              const count = badgeOf(href);
              return (
                // Thu gọn → rê chuột vào icon để xem tên mục
                <Tooltip key={href} title={collapsed ? label : ''} placement="right">
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-label={collapsed ? label : undefined}
                    aria-current={isActive(pathname, href) ? 'page' : undefined}
                    className={styles.item}
                  >
                    <Icon />
                    {!collapsed && label}
                    {count > 0 &&
                      (collapsed ? (
                        <span className={styles.dot} />
                      ) : (
                        <span className={styles.pill}>{count > 99 ? '99+' : count}</span>
                      ))}
                  </Link>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>

      <div className={styles.foot}>
        <Tooltip title={collapsed ? 'Về cửa hàng' : ''} placement="right">
          <Link
            href="/"
            target="_blank"
            aria-label={collapsed ? 'Về cửa hàng' : undefined}
            className={styles.item}
          >
            <IconStore />
            {!collapsed && 'Về cửa hàng'}
          </Link>
        </Tooltip>
      </div>
    </nav>
  );
}

/** Menu tài khoản trên thanh trên: rê chuột là sổ ra (cảm ứng: bấm) */
function AdminAccount() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    setOpen(false);
    logout.mutate(undefined, {
      onSuccess: () => {
        enqueueSnackbar('Đã đăng xuất', { variant: 'info' });
        router.replace('/dang-nhap');
      },
      onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
    });
  };

  if (!user) return null;

  return (
    <HoverMenu
      open={open}
      onOpenChange={setOpen}
      panelClassName={styles.menu}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={styles.me}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Tài khoản: ${user.fullName}`}
        >
          <span className={styles.meName}>{user.fullName}</span>
          <UserAvatar fullName={user.fullName} size={34} />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="menu-who">
            <b>{user.fullName}</b>
            <span>{user.email}</span>
          </div>
          <nav className="menu-list" aria-label="Tài khoản">
            <Link href="/" target="_blank" onClick={close}>
              <IconStore />
              Xem cửa hàng
            </Link>
            <div className="menu-sep" />
            <button type="button" onClick={handleLogout} disabled={logout.isPending}>
              <IconLogout />
              Đăng xuất
            </button>
          </nav>
        </>
      )}
    </HoverMenu>
  );
}

/** Khung trang quản trị: sidebar trái (cố định trên desktop ≥ 1180px, ngăn kéo bên dưới) + thanh trên */
export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // AdminShell chỉ render ở trình duyệt (sau RequireRole) → đọc storage ngay khi khởi tạo không lệch SSR
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    saveCollapsed(!collapsed);
    setCollapsed(!collapsed);
  };

  return (
    <div className={styles.shell}>
      {/* Desktop */}
      <aside className={styles.aside}>
        <SidebarContent collapsed={collapsed} />
      </aside>
      {/* Mobile / tablet */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        className={styles.drawer}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={`ic ${styles.burger}`}
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
          >
            <IconMenu />
          </button>
          <Link href="/admin" className={styles.mobileLogo}>
            BookStore
          </Link>
          {/* Desktop: thu gọn / mở rộng thanh menu bên trái */}
          <Tooltip title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>
            <button
              type="button"
              className={`ic ${styles.collapseBtn}`}
              data-collapsed={collapsed}
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
              aria-expanded={!collapsed}
            >
              <IconCollapse />
            </button>
          </Tooltip>
          <div className={styles.right}>
            <AdminAccount />
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
