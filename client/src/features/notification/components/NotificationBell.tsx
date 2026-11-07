'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CountBadge } from '@/components/ui/CountBadge';
import { HoverMenu } from '@/components/ui/HoverMenu';
import { IconBell } from '@/components/ui/icons';
import {
  NOTIFICATIONS_PATH,
  useMarkAllRead,
  useMenuNotifications,
  useNotificationUser,
  useUnreadCount,
} from '../hooks/useNotifications';
import styles from './NotificationBell.module.css';
import { NotificationItem } from './NotificationItem';

/**
 * Chuông thông báo trên Header (M13 mục 4.1) — chỉ khách hàng đã đăng nhập.
 * Nút icon tròn kiểu demo 07 (`className` do Header truyền) → rê chuột sổ hộp 8 thông báo mới nhất.
 * Màn ≤ 640px Header ẩn icon này; khách vào trang Thông báo qua menu tài khoản.
 */
export function NotificationBell({ className = '' }: { className?: string }) {
  const user = useNotificationUser();
  const count = useUnreadCount();
  const [open, setOpen] = useState(false);
  const menu = useMenuNotifications(open);
  const markAllRead = useMarkAllRead();

  if (!user) return null;

  return (
    <HoverMenu
      open={open}
      onOpenChange={setOpen}
      panelClassName={styles.paper}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className={className}
          aria-label={`Thông báo: ${count} chưa đọc`}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <IconBell />
          <CountBadge count={count} hideZero />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className={styles.head}>
            <h2>Thông báo</h2>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="more"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
          <div className={styles.scroll}>
            {menu.isPending ? (
              <div className={styles.wait} role="status" aria-label="Đang tải">
                <span aria-hidden="true">✦</span>
              </div>
            ) : menu.data && menu.data.length > 0 ? (
              <ul className={styles.list}>
                {menu.data.map((notification) => (
                  <li key={notification.id}>
                    <NotificationItem notification={notification} compact onNavigate={close} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>Bạn chưa có thông báo nào</p>
            )}
          </div>
          <Link href={NOTIFICATIONS_PATH} onClick={close} className={styles.all}>
            Xem tất cả
          </Link>
        </>
      )}
    </HoverMenu>
  );
}
