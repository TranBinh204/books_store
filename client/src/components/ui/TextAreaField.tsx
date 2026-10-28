'use client';

import { useId, type ReactNode } from 'react';
import styles from './FormField.module.css';

/** Ô nhiều dòng `.field` + nhãn + bộ đếm ký tự (chưa gắn form) */
export function TextAreaField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  hint,
  error,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  hint?: ReactNode;
  error?: string | null;
  rows?: number;
}) {
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={styles.box}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        id={id}
        className={`field ${styles.area}`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={noteId}
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
      />
      <p id={noteId} className={`${error ? styles.error : styles.hint} ${styles.count}`}>
        <span>{error ?? hint}</span>
        <span>
          {value.length}/{maxLength}
        </span>
      </p>
    </div>
  );
}
