import Link from 'next/link';
import { BookCard } from '@/components/shop/BookCard';
import { Breadcrumb } from '@/components/shop/Breadcrumb';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { ListingEmpty } from '@/components/shop/ListingEmpty';
import { getCurrentFlashSale, getUpcomingFlashSale } from '../api/flash-sale.api';
import { Candles } from './Candles';
import { Countdown } from './Countdown';
import styles from './FlashSalePage.module.css';

const HOME_ACTION = { href: '/', label: 'Về trang chủ', variant: 'gold' } as const;

/**
 * Trang /flash-sale (M12 mục 4.2): bản đầy đủ của khối "Lời nguyền nửa đêm" ở trang chủ.
 * Có đợt đang chạy → đếm ngược + lưới thẻ đỏ; chưa có nhưng có đợt sắp tới → đếm ngược tới giờ mở;
 * không có gì → trạng thái rỗng. Đếm ngược về 0 thì Countdown làm mới trang.
 */
export async function FlashSalePage() {
  const sale = await getCurrentFlashSale();
  const running = sale && sale.items.length > 0 ? sale : null;
  const upcoming = running ? null : await getUpcomingFlashSale();

  return (
    <>
      <div className="wrap">
        <Breadcrumb items={[{ label: 'Flash Sale' }]} />
      </div>

      {running ? (
        <section className={`curse-bg ${styles.page}`}>
          <div className="wrap">
            <SectionTitle
              tone="curse"
              before={<Candles />}
              chapter="Flash Sale"
              title={
                <>
                  Lời nguyền <em>nửa đêm</em>
                </>
              }
              subtitle={running.name}
              compact
            />
            <div data-reveal="">
              <Countdown endAt={running.endAt} />
            </div>
            <p className={styles.count}>
              <b>{running.items.length}</b> tác phẩm đang bị nguyền
            </p>
            <div className={styles.grid}>
              {running.items.map((book) => (
                <div key={book.id} data-reveal="">
                  <BookCard book={book} variant="curse" showFlashProgress />
                </div>
              ))}
            </div>
            <div className={styles.back}>
              <Link href="/" className="more">
                ← Về trang chủ
              </Link>
            </div>
          </div>
        </section>
      ) : upcoming ? (
        <section className={`curse-bg ${styles.page}`}>
          <div className="wrap">
            <SectionTitle
              tone="curse"
              before={<Candles />}
              chapter="Flash Sale · Sắp mở"
              title={
                <>
                  Lời nguyền <em>sắp thức giấc</em>
                </>
              }
              subtitle={`${upcoming.name} — bắt đầu sau`}
              compact
            />
            <div data-reveal="">
              <Countdown endAt={upcoming.startAt} />
            </div>
            <p className={styles.count}>
              <b>{upcoming.itemCount}</b> tác phẩm đang chờ được nguyền
            </p>
            <div className={styles.back}>
              <Link href="/" className="btn btn-gold">
                Về trang chủ
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="wrap pb-10">
          <ListingEmpty
            message="Hiện chưa có chương trình Flash Sale nào. Quay lại sau nhé!"
            action={HOME_ACTION}
          />
        </div>
      )}
    </>
  );
}
