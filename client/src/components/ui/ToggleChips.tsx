'use client';

import type { ReactNode } from 'react';
import styles from './ChoiceChips.module.css';

/** Một viên chọn nhiều (checkbox thật ẩn, hiển thị như chip) — dùng chung style với ChoiceChips */
export function ToggleChip({
  checked,
  onChange,
  strong = false,
  disabled = false,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  /** Chữ đậm (vd. danh mục cha) */
  strong?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={styles.item}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} />
      <span
        className={`chip chip-soft ${styles.chip} ${styles.toggle} ${strong ? styles.strong : ''}`}
      >
        {checked && <span aria-hidden="true">✦ </span>}
        {children}
      </span>
    </label>
  );
}
