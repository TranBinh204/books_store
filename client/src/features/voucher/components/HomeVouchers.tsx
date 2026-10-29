import { SectionTitle } from '@/components/shop/SectionTitle';
import type { PublicVoucher } from '../types';
import styles from './HomeVouchers.module.css';
import { VoucherCard } from './VoucherCard';

/** Chương IV · "Những cuộn bùa may mắn" (M11 mục 4.1, trang chủ khối 7) — không có mã thì ẩn */
export function HomeVouchers({ vouchers }: { vouchers: PublicVoucher[] }) {
  if (vouchers.length === 0) return null;
  return (
    <section className="sec">
      <div className="wrap">
        <SectionTitle
          chapter="Chương IV · Ưu đãi"
          title={
            <>
              Những <em>cuộn bùa</em> may mắn
            </>
          }
          subtitle="Chạm vào dấu sáp để lưu mã"
        />
        <div className={styles.scrolls} data-stagger="">
          {vouchers.map((voucher) => (
            <VoucherCard key={voucher.code} voucher={voucher} />
          ))}
        </div>
      </div>
    </section>
  );
}
