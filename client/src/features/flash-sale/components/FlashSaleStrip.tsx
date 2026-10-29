import { isFlashSaleAvailable, type BookFlashSale } from '../types';
import { Countdown } from './Countdown';
import styles from './FlashSaleStrip.module.css';
import { SoldProgress } from './SoldProgress';

/**
 * Dải cam trên khối giá ở trang chi tiết sách (M12 mục 4.4):
 * ⚡ FLASH SALE · Kết thúc sau 02:15:08 · thanh "Đã bán x/y". Hết suất → "Đã hết suất Flash Sale".
 */
export function FlashSaleStrip({ flashSale }: { flashSale: BookFlashSale }) {
  const available = isFlashSaleAvailable(flashSale);
  return (
    <div className={styles.strip}>
      {available ? (
        <p>
          <b>⚡ Flash Sale</b>
          <span>· Kết thúc sau</span>
          <Countdown endAt={flashSale.endAt} variant="inline" />
        </p>
      ) : (
        <p>
          <b>⚡ Đã hết suất Flash Sale</b>
        </p>
      )}
      <div className={styles.sold}>
        <SoldProgress sold={flashSale.sold} quantity={flashSale.quantity} />
      </div>
    </div>
  );
}
