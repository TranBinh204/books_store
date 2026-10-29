'use client';

import { Drawer } from '@mui/material';
import type { ReactNode } from 'react';
import styles from './Listing.module.css';

/**
 * Ngăn kéo "Bộ lọc" trên màn ≤ 1180px (shop/02). Giữ MUI Drawer vì có sẵn bẫy focus + Esc;
 * chỉ đổi giao diện. Chân ngăn: "Xoá bộ lọc" · "Xem N tác phẩm" (đóng ngăn).
 */
export function FilterDrawer({
  open,
  onClose,
  onClear,
  total,
  canClear,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onClear: () => void;
  /** Tổng số sách khớp bộ lọc hiện tại */
  total: number;
  canClear: boolean;
  children: ReactNode;
}) {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { className: styles.drawer } }}
    >
      <div className={styles.drawerHead}>
        <h2>Bộ lọc</h2>
        <button
          type="button"
          className={styles.drawerClose}
          onClick={onClose}
          aria-label="Đóng bộ lọc"
        >
          ×
        </button>
      </div>
      <div className={styles.drawerBody}>{children}</div>
      <div className={styles.drawerFoot}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClear}
          disabled={!canClear}
        >
          Xoá bộ lọc
        </button>
        <button type="button" className="btn btn-gold btn-sm" onClick={onClose}>
          Xem {total} tác phẩm
        </button>
      </div>
    </Drawer>
  );
}
