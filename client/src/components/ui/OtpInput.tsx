'use client';

import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import styles from './OtpInput.module.css';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  label: string;
  error?: string;
  autoFocus?: boolean;
}

/** Mã một lần dạng ô rời: tự nhảy ô, Backspace lùi, dán cả mã trải ra các ô. Giá trị là một chuỗi số */
export function OtpInput({ value, onChange, length = 6, label, error, autoFocus }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusAt = (index: number) =>
    refs.current[Math.min(Math.max(index, 0), length - 1)]?.focus();

  /** Đặt ô `index`; ô trống giữ chỗ bằng dấu cách để các số sau không bị dồn */
  const setAt = (index: number, digit: string) => {
    const next = digits.map((d, i) => (i === index ? digit : d || ' ')).join('');
    onChange(next.trimEnd());
  };

  const onInput = (index: number, raw: string) => {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;
    if (typed.length > 1) {
      // Nhiều số cùng lúc (tự điền của trình duyệt) → trải ra từ ô hiện tại
      const merged = (value.slice(0, index) + typed).slice(0, length);
      onChange(merged);
      focusAt(merged.length);
      return;
    }
    setAt(index, typed);
    focusAt(index + 1);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) {
        setAt(index, ' ');
      } else if (index > 0) {
        setAt(index - 1, ' ');
        focusAt(index - 1);
      }
    } else if (event.key === 'ArrowLeft') {
      focusAt(index - 1);
    } else if (event.key === 'ArrowRight') {
      focusAt(index + 1);
    }
  };

  const onPaste = (event: ClipboardEvent) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    focusAt(pasted.length);
  };

  return (
    <div className={styles.box}>
      <div className={styles.row} role="group" aria-label={label} data-invalid={Boolean(error)}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              refs.current[index] = el;
            }}
            className={styles.cell}
            value={digit.trim()}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && index === 0}
            aria-label={`${label}, số ${index + 1}`}
            aria-invalid={Boolean(error)}
            onChange={(event) => onInput(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            onPaste={onPaste}
            onFocus={(event) => event.target.select()}
          />
        ))}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
