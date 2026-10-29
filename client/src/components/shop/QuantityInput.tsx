'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './QuantityInput.module.css';

interface QuantityInputProps {
  value: number;
  /** Tối đa (vd min(tồn kho, 99)) */
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const clamp = (value: number, max: number) =>
  Math.min(Math.max(1, Number.isFinite(value) ? Math.trunc(value) : 1), Math.max(1, max));

/** Ô số lượng − [n] + : gõ trực tiếp thì áp dụng khi rời ô / Enter, luôn trong khoảng 1..max */
export function QuantityInput({ value, max, onChange, disabled, size = 'md' }: QuantityInputProps) {
  // Bản nháp khi đang gõ; null = hiển thị đúng `value`
  const [draft, setDraft] = useState<string | null>(null);
  // Giá trị mới nhất ngay khi bấm − / + (bấm nhanh 2 lần trước khi vẽ lại vẫn cộng đủ)
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const step = (delta: number) => {
    const next = clamp(latest.current + delta, max);
    if (next === latest.current) return;
    latest.current = next;
    onChange(next);
  };

  const commit = () => {
    if (draft === null) return;
    const next = clamp(Number(draft), max);
    setDraft(null);
    if (next !== value) onChange(next);
  };

  return (
    <div className={`${styles.qty} ${size === 'sm' ? styles.sm : ''}`} data-disabled={disabled}>
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={disabled || value <= 1}
        aria-label="Giảm số lượng"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={draft ?? value}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && commit()}
        aria-label="Số lượng"
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={disabled || value >= max}
        aria-label="Tăng số lượng"
      >
        +
      </button>
    </div>
  );
}
