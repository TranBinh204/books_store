import { PRICE_RANGES, type ListingUrlState, type PriceRangeValue } from '../listing';
import type { PublisherFacet } from '../types/catalog.types';
import styles from './Listing.module.css';

/** Hàng chip các bộ lọc đang áp (nhà xuất bản, khoảng giá) — mỗi chip có `×` để bỏ riêng */
export function ActiveFilters({
  publishers,
  urlState,
  onRemovePublisher,
  onRemovePrice,
}: {
  publishers: PublisherFacet[];
  urlState: ListingUrlState;
  onRemovePublisher: (id: number) => void;
  onRemovePrice: (price: PriceRangeValue | undefined) => void;
}) {
  const chosen = publishers.filter((publisher) => urlState.publisherIds.includes(publisher.id));
  const priceLabel = PRICE_RANGES.find((range) => range.value === urlState.price)?.label;
  if (chosen.length === 0 && !priceLabel) return null;

  return (
    <div className={`scroll-x ${styles.chips}`} aria-label="Bộ lọc đang áp dụng">
      {chosen.map((publisher) => (
        <button
          key={publisher.id}
          type="button"
          className="chip chip-soft"
          aria-pressed="true"
          aria-label={`Bỏ lọc nhà xuất bản ${publisher.name}`}
          onClick={() => onRemovePublisher(publisher.id)}
        >
          {publisher.name}
          <i className={styles.chipX} aria-hidden="true">
            ×
          </i>
        </button>
      ))}
      {priceLabel && (
        <button
          type="button"
          className="chip chip-soft"
          aria-pressed="true"
          aria-label={`Bỏ lọc giá ${priceLabel}`}
          onClick={() => onRemovePrice(undefined)}
        >
          {priceLabel}
          <i className={styles.chipX} aria-hidden="true">
            ×
          </i>
        </button>
      )}
    </div>
  );
}
