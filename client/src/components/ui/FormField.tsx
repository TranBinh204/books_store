'use client';

import { useId, useState, type HTMLInputAutoCompleteAttribute, type ReactNode } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import styles from './FormField.module.css';

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'date';
  /** Khoá ô (vd. email không đổi được) */
  disabled?: boolean;
  /** Giới hạn cho ô ngày (yyyy-mm-dd) */
  min?: string;
  max?: string;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  autoFocus?: boolean;
  /** Gợi ý dưới ô (bị thay bằng lỗi khi có lỗi) */
  hint?: ReactNode;
  /** Nội dung cuối ô (vd. dấu ✓ khi khớp) */
  adornment?: ReactNode;
}

/** Ô nhập native gắn react-hook-form: nhãn + lỗi + gợi ý; kiểu mật khẩu có nút hiện / ẩn */
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  type = 'text',
  autoComplete,
  autoFocus,
  disabled,
  min,
  max,
  hint,
  adornment,
}: FormFieldProps<T>) {
  const id = useId();
  const { field, fieldState } = useController({ name, control });
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const error = fieldState.error?.message;
  const noteId = `${id}-note`;

  return (
    <div className={styles.box}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.row}>
        <input
          {...field}
          id={id}
          className={`field ${styles.input}`}
          type={isPassword && show ? 'text' : type}
          value={field.value ?? ''}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          min={min}
          max={max}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? noteId : undefined}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.eye}
            onClick={() => setShow((value) => !value)}
            aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={show}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" strokeWidth="1.6">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {!show && <path d="M4 4l16 16" />}
            </svg>
          </button>
        )}
        {adornment && !isPassword && <span className={styles.adorn}>{adornment}</span>}
      </div>
      {error ? (
        <p id={noteId} className={styles.error} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={noteId} className={styles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Ô chỉ xem (không gắn form): cùng kiểu với FormField, bị khoá, có biểu tượng cuối ô */
export function ReadOnlyField({
  label,
  value,
  hint,
  adornment,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  adornment?: ReactNode;
}) {
  const id = useId();
  return (
    <div className={styles.box}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.row}>
        <input id={id} className={`field ${styles.input}`} value={value} disabled readOnly />
        {adornment && <span className={styles.adorn}>{adornment}</span>}
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
