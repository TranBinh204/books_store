import type { ReactNode } from 'react';
import styles from './ChoiceCard.module.css';

interface ChoiceCardProps {
  /** Cùng nhóm radio (bàn phím: mũi tên chuyển thẻ) */
  name: string;
  checked: boolean;
  disabled?: boolean;
  /** Bỏ trống → thẻ duy nhất, chọn sẵn (vd vận chuyển) */
  onChange?: () => void;
  children: ReactNode;
}

/** Thẻ chọn một trong nhiều (địa chỉ, vận chuyển, thanh toán): radio ẩn + vòng vàng, viền sáng khi chọn */
export function ChoiceCard({
  name,
  checked,
  disabled = false,
  onChange,
  children,
}: ChoiceCardProps) {
  return (
    <label className={styles.card} data-disabled={disabled}>
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.()}
        readOnly={!onChange}
      />
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.body}>{children}</span>
    </label>
  );
}
