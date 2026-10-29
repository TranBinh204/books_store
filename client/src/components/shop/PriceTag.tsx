import { discountPercent, formatPrice } from '@/lib/format';
import styles from './PriceTag.module.css';

interface PriceTagProps {
  price: number;
  originalPrice: number;
  /**
   * `card` (thẻ sách) · `curse` (thẻ Flash Sale, giá cam) ·
   * `parchment` (trên giấy da, giá đỏ cùng dòng) · `detail` (trang chi tiết, kèm nhãn -x%)
   */
  variant?: 'card' | 'curse' | 'parchment' | 'detail';
}

/** Giá bán + giá gốc gạch ngang (chỉ hiện khi giá gốc lớn hơn) — components.md 2.4 */
export function PriceTag({ price, originalPrice, variant = 'card' }: PriceTagProps) {
  const original = originalPrice > price ? <s>{formatPrice(originalPrice)}</s> : null;

  if (variant === 'parchment') {
    return (
      <span className={styles.parchment}>
        {formatPrice(price)}
        {original}
      </span>
    );
  }

  if (variant === 'detail') {
    const off = discountPercent(originalPrice, price);
    return (
      <div className={styles.detail}>
        <b>{formatPrice(price)}</b>
        {original}
        {off > 0 && <span className={styles.off}>-{off}%</span>}
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${variant === 'curse' ? styles.curse : ''}`}>
      <b>{formatPrice(price)}</b>
      {original}
    </div>
  );
}
