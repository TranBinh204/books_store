'use client';

import { useState, type ReactNode } from 'react';
import { PRICE_RANGES, type PriceRangeValue } from '../listing';
import type { PublisherFacet } from '../types/catalog.types';
import styles from './Listing.module.css';

/** Số nhà xuất bản hiện sẵn; còn lại nằm sau nút "Xem thêm" */
const PUBLISHERS_VISIBLE = 8;

interface FilterPanelProps {
  publishers: PublisherFacet[];
  publisherIds: number[];
  price?: PriceRangeValue;
  onPublishersChange: (ids: number[]) => void;
  /** Bấm lại khoảng giá đang chọn → bỏ chọn */
  onPriceChange: (price: PriceRangeValue | undefined) => void;
  onClear: () => void;
  /** Trong ngăn kéo: không khung panel, không tiêu đề (ngăn kéo tự có) */
  bare?: boolean;
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.filterGroup}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

/** Dòng chọn: input gốc + thoi xoay 45° + tên + số sách */
function Option({
  type,
  checked,
  label,
  count,
  onChange,
}: {
  type: 'checkbox' | 'radio';
  checked: boolean;
  label: string;
  count?: number;
  onChange: () => void;
}) {
  return (
    <label className={styles.filterOpt}>
      {/* Radio: bấm lại khi đang chọn thì bỏ chọn nên dùng onClick thay vì onChange */}
      <input
        type={type}
        checked={checked}
        onChange={type === 'checkbox' ? onChange : () => undefined}
        onClick={type === 'radio' ? onChange : undefined}
      />
      <span className={styles.filterBox} aria-hidden="true" />
      <span className={styles.filterName}>{label}</span>
      {count !== undefined && <span className={styles.filterNum}>{count}</span>}
    </label>
  );
}

/** Cột lọc trang danh mục: Nhà xuất bản (chọn nhiều) · Giá (chọn 1) */
export function FilterPanel({
  publishers,
  publisherIds,
  price,
  onPublishersChange,
  onPriceChange,
  onClear,
  bare = false,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const hasFilter = publisherIds.length > 0 || price !== undefined;

  // NXB đã chọn luôn hiện, dù nằm ngoài 8 nhà đầu
  const visible = expanded
    ? publishers
    : publishers.filter(
        (publisher, index) => index < PUBLISHERS_VISIBLE || publisherIds.includes(publisher.id),
      );
  const hidden = publishers.length - visible.length;

  const togglePublisher = (id: number) =>
    onPublishersChange(
      publisherIds.includes(id)
        ? publisherIds.filter((item) => item !== id)
        : [...publisherIds, id],
    );

  return (
    <div className={`${bare ? styles.filterBare : `panel ${styles.filterPanel}`}`}>
      {!bare && (
        <div className={styles.filterHead}>
          <h2>Bộ lọc</h2>
          {hasFilter && (
            <button type="button" className={styles.filterClear} onClick={onClear}>
              Xoá bộ lọc
            </button>
          )}
        </div>
      )}

      {publishers.length > 0 && (
        <FilterGroup title="Nhà xuất bản">
          {visible.map((publisher) => (
            <Option
              key={publisher.id}
              type="checkbox"
              checked={publisherIds.includes(publisher.id)}
              label={publisher.name}
              count={publisher.bookCount}
              onChange={() => togglePublisher(publisher.id)}
            />
          ))}
          {(hidden > 0 || expanded) && publishers.length > PUBLISHERS_VISIBLE && (
            <button
              type="button"
              className={`more ${styles.filterExpand}`}
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
            >
              {expanded ? 'Thu gọn' : `Xem thêm ${hidden} nhà xuất bản`}
            </button>
          )}
        </FilterGroup>
      )}

      <FilterGroup title="Giá sản phẩm">
        {PRICE_RANGES.map((range) => (
          <Option
            key={range.value}
            type="radio"
            checked={price === range.value}
            label={range.label}
            onChange={() => onPriceChange(price === range.value ? undefined : range.value)}
          />
        ))}
      </FilterGroup>
    </div>
  );
}
