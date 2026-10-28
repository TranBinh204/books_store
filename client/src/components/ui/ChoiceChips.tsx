'use client';

import { useId } from 'react';
import styles from './ChoiceChips.module.css';

export interface ChoiceOption<V extends string> {
  value: V;
  label: string;
}

interface ChoiceChipsProps<V extends string> {
  label: string;
  options: readonly ChoiceOption<V>[];
  value: V | null;
  onChange: (value: V | null) => void;
  /** Bấm lại viên đang chọn thì bỏ chọn (mặc định: có) */
  clearable?: boolean;
  /** stack: xếp dọc, mỗi lựa chọn một hàng (chữ dài) */
  layout?: 'row' | 'stack';
}

/** Chọn một trong nhiều: radio thật (ẩn) hiển thị như chip, dùng được bằng bàn phím */
export function ChoiceChips<V extends string>({
  label,
  options,
  value,
  onChange,
  clearable = true,
  layout = 'row',
}: ChoiceChipsProps<V>) {
  const name = useId();
  return (
    <fieldset className={styles.set}>
      <legend className={styles.legend}>{label}</legend>
      <div className={`${styles.row} ${layout === 'stack' ? styles.stack : ''}`}>
        {options.map((option) => (
          <label key={option.value} className={styles.item}>
            <input
              type="radio"
              name={name}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              // Radio không bắn onChange khi bấm lại viên đang chọn → bắt bằng onClick
              onClick={() => clearable && value === option.value && onChange(null)}
            />
            <span className={`chip chip-soft ${styles.chip}`}>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
