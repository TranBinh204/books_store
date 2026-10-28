import type { ReactNode } from 'react';
import styles from './CheckField.module.css';

/** Hộp chọn tự vẽ (input thật ẩn bằng CSS để bàn phím / trình đọc màn hình vẫn dùng được) */
export function CheckField({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={styles.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.box} aria-hidden="true">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" strokeWidth="2.4">
          <path d="M3 8.5l3.2 3.2L13 4.8" />
        </svg>
      </span>
      {children}
    </label>
  );
}
