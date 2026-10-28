'use client';

import { useId, useState } from 'react';
import comboStyles from './ComboField.module.css';
import fieldStyles from './FormField.module.css';
import { IconClose } from './icons';
import styles from './TagInput.module.css';

export interface Tag {
  id: number;
  name: string;
}

/**
 * Chọn nhiều có tìm từ xa: thẻ đã chọn + ô gõ + danh sách thả xuống (↑ ↓ Enter Esc, Backspace xoá thẻ cuối).
 * Cha lo gọi API: truyền `options` theo `query`.
 */
export function TagInput({
  label,
  value,
  onChange,
  query,
  onQueryChange,
  options,
  loading,
  max,
  placeholder,
  emptyText,
}: {
  label: string;
  value: Tag[];
  onChange: (tags: Tag[]) => void;
  query: string;
  onQueryChange: (query: string) => void;
  options: readonly Tag[];
  loading?: boolean;
  max: number;
  placeholder?: string;
  emptyText: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const shown = options.filter((option) => !value.some((tag) => tag.id === option.id));
  const full = value.length >= max;

  const add = (tag: Tag) => {
    if (full) return;
    onChange([...value, { id: tag.id, name: tag.name }]);
    onQueryChange('');
    setActive(0);
  };
  const remove = (tagId: number) => onChange(value.filter((tag) => tag.id !== tagId));

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => Math.min(Math.max(index + step, 0), shown.length - 1));
    } else if (event.key === 'Enter' && open && shown[active]) {
      event.preventDefault();
      add(shown[active]);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === 'Backspace' && !query && value.length > 0) {
      remove(value[value.length - 1].id);
    }
  };

  return (
    <div className={fieldStyles.box}>
      <label htmlFor={id} className={fieldStyles.label}>
        {label}
      </label>
      <div className={fieldStyles.row}>
        <div className={`field ${styles.wrap}`}>
          {value.map((tag) => (
            <span key={tag.id} className={styles.tag}>
              {tag.name}
              <button type="button" onClick={() => remove(tag.id)} aria-label={`Bỏ ${tag.name}`}>
                <IconClose width="12" height="12" />
              </button>
            </span>
          ))}
          <input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            autoComplete="off"
            disabled={full}
            value={query}
            placeholder={value.length ? '' : placeholder}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
        </div>
        {open && !full && (
          <ul id={`${id}-list`} role="listbox" className={`panel ${comboStyles.list}`}>
            {loading && <li className={comboStyles.empty}>Đang tìm...</li>}
            {!loading && shown.length === 0 && <li className={comboStyles.empty}>{emptyText}</li>}
            {shown.map((option, index) => (
              <li
                key={option.id}
                role="option"
                aria-selected={false}
                data-active={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  add(option);
                }}
                onMouseEnter={() => setActive(index)}
              >
                {option.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
