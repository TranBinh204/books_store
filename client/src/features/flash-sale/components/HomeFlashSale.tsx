import Link from 'next/link';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { BookSlider } from '@/features/catalog/components/BookSlider';
import type { CurrentFlashSale } from '../types';
import { Candles } from './Candles';
import { Countdown } from './Countdown';
import styles from './HomeFlashSale.module.css';

/** Số sách tối đa ở khối trang chủ (mục 4.1) */
const HOME_FLASH_SALE_LIMIT = 12;

/**
 * Chương II · Flash Sale "Lời nguyền nửa đêm" (M12 mục 4.1, trang chủ khối 4):
 * 3 ngọn nến · đếm ngược ô bát giác · slider thẻ đỏ có thanh lửa "đã bán".
 * Không có chương trình đang chạy thì ẩn; hết giờ thì Countdown làm mới trang.
 */
export function HomeFlashSale({ sale }: { sale: CurrentFlashSale | null }) {
  if (!sale || sale.items.length === 0) return null;
  return (
    <section className={`curse-bg ${styles.curse}`} id="curse" data-pausable>
      <div className="wrap">
        <SectionTitle
          tone="curse"
          before={<Candles />}
          chapter="Chương II · Flash Sale"
          title={
            <>
              Lời nguyền <em>nửa đêm</em>
            </>
          }
          subtitle="Khi đồng hồ cạn, phép giảm giá sẽ tan biến…"
        />
        <div data-reveal="">
          <Countdown endAt={sale.endAt} variant="curse" />
        </div>
        <BookSlider
          books={sale.items.slice(0, HOME_FLASH_SALE_LIMIT)}
          label="Sách Flash Sale"
          variant="curse"
          showFlashProgress
        />
        <div className={styles.all}>
          <Link href="/flash-sale" className="more">
            Xem toàn bộ lời nguyền →
          </Link>
        </div>
      </div>
    </section>
  );
}
