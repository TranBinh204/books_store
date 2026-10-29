'use client';

import { useId } from 'react';
import { RELEVANCE_OPTION, SORT_OPTIONS } from '../listing';
import type { BookSort } from '../types/catalog.types';
import styles from './Listing.module.css';

interface SortSelectProps {
  value: BookSort;
  /** Có từ khoá tìm kiếm → thêm "Liên quan nhất" */
  withRelevance?: boolean;
  onChange: (sort: BookSort) => void;
}

/** Ô "Sắp xếp theo" của trang danh mục / tìm kiếm */
export function SortSelect({ value, withRelevance = false, onChange }: SortSelectProps) {
  const id = useId();
  const options = withRelevance ? [RELEVANCE_OPTION, ...SORT_OPTIONS] : SORT_OPTIONS;
  return (
    <div className={styles.sortWrap}>
      <label htmlFor={id} className={styles.sortLabel}>
        Sắp xếp theo
      </label>
      <select
        id={id}
        className={`field ${styles.sortSelect}`}
        value={value}
        onChange={(event) => onChange(event.target.value as BookSort)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
