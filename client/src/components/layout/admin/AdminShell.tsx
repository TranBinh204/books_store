'use client';

import { Drawer, Tooltip } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import {
  IconBook,
  IconBuilding,
  IconCategory,
  IconCollapse,
  IconDashboard,
  IconInventory,
  IconMenu,
  IconStore,
  IconUser,
} from '@/components/ui/icons';
import styles from './AdminShell.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** Menu bên trái — thêm nhóm / mục khi làm từng module */
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
  // Số đếm trên từng mục theo href (vd. đơn chờ xác nhận) — module bổ sung, 0 / không có = không hiện
  const badges: Record<string, number> = {};

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
              const count = badges[href] ?? 0;
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

/** Khung trang quản trị: sidebar trái (cố định trên desktop ≥ 1180px, ngăn kéo bên dưới) + thanh trên */
export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  // Bọc AdminShell sau RequireRole (module Auth) → chỉ render ở trình duyệt, đọc storage ngay không lệch SSR
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
          {/* Menu tài khoản Admin — làm ở module Auth */}
          <div className={styles.right} />
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
