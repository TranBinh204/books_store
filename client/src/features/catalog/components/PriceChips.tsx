import { PRICE_RANGES, type PriceRangeValue } from '../listing';
import styles from './Listing.module.css';

/** Chip khoảng giá của trang tìm kiếm (chọn 1; bấm lại chip đang chọn thì bỏ) */
export function PriceChips({
  value,
  onChange,
}: {
  value?: PriceRangeValue;
  onChange: (price: PriceRangeValue | undefined) => void;
}) {
  return (
    <div className={`scroll-x ${styles.chips}`} role="group" aria-label="Lọc theo giá">
      {PRICE_RANGES.map((range) => (
        <button
          key={range.value}
          type="button"
          className="chip chip-soft"
          aria-pressed={value === range.value}
          onClick={() => onChange(value === range.value ? undefined : range.value)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
