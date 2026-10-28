'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconChevron } from './icons';
import fieldStyles from './FormField.module.css';
import styles from './ComboField.module.css';

/** Bỏ dấu tiếng Việt để gõ "ha noi" vẫn tìm được "Hà Nội" */
export function removeAccents(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export interface ComboOption {
  code: number;
  name: string;
}

interface ComboFieldProps {
  label: string;
  options: readonly ComboOption[];
  /** Mã đang chọn (null = chưa chọn) */
  value: number | null;
  onChange: (code: number | null) => void;
  onBlur?: () => void;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
  emptyText?: string;
}

/**
 * Ô chọn có gõ để tìm (không phân biệt dấu): bàn phím ↑ ↓ Enter Esc, `role="combobox"`.
 * Chưa gắn form — bọc bằng Controller ở nơi dùng.
 */
export function ComboField({
  label,
  options,
  value,
  onChange,
  onBlur,
  error,
  hint,
  disabled,
  emptyText = 'Không tìm thấy kết quả',
}: ComboFieldProps) {
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const selected = options.find((option) => option.code === value) ?? null;
  const [open, setOpen] = useState(false);
  /** null = hiện tên đang chọn; chuỗi = đang gõ tìm */
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  const shown = useMemo(() => {
    if (!query) return options;
    const keyword = removeAccents(query);
    return options.filter((option) => removeAccents(option.name).includes(keyword));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery(null);
  };
  /** Mở danh sách → nhảy tới mục đang chọn */
  const openList = () => {
    if (open) return;
    setActive(
      Math.max(
        options.findIndex((option) => option.code === value),
        0,
      ),
    );
    setOpen(true);
  };
  const pick = (option: ComboOption) => {
    onChange(option.code);
    close();
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return openList();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => Math.min(Math.max(index + step, 0), shown.length - 1));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (shown[active]) pick(shown[active]);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      close();
    }
  };

  const noteId = `${id}-note`;
  return (
    <div className={fieldStyles.box}>
      <label htmlFor={id} className={fieldStyles.label}>
        {label}
      </label>
      <div className={fieldStyles.row}>
        <input
          id={id}
          className={`field ${fieldStyles.input} ${styles.input}`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && shown[active] ? `${id}-${shown[active].code}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? noteId : undefined}
          autoComplete="off"
          disabled={disabled}
          value={query ?? selected?.name ?? ''}
          placeholder="Chọn hoặc gõ để tìm"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={openList}
          onClick={openList}
          onBlur={() => {
            close();
            onBlur?.();
          }}
          onKeyDown={onKeyDown}
        />
        <span className={styles.chev} data-open={open}>
          <IconChevron width="18" height="18" />
        </span>
        {open && (
          <ul id={`${id}-list`} ref={listRef} role="listbox" className={`panel ${styles.list}`}>
            {shown.length === 0 && <li className={styles.empty}>{emptyText}</li>}
            {shown.map((option, index) => (
              <li
                key={option.code}
                id={`${id}-${option.code}`}
                role="option"
                aria-selected={option.code === value}
                data-active={index === active}
                // mousedown (không phải click) để ô nhập chưa kịp mất focus
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(option);
                }}
                onMouseEnter={() => setActive(index)}
              >
                {option.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error ? (
        <p id={noteId} className={fieldStyles.error} role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={noteId} className={fieldStyles.hint}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
