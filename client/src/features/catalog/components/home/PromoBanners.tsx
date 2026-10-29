import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './PromoBanners.module.css';

/**
 * 2 banner khuyến mãi — ảnh cứng trong client/public/img (components.md Q3), chữ đè lên như demo 07.
 * Link tạm tới trang tìm kiếm theo chủ đề.
 */
const PROMOS: { href: string; image: string; kicker: string; title: ReactNode; cta: string }[] = [
  {
    href: '/tim-kiem?q=fantasy',
    image: '/img/promo-fantasy.jpg',
    kicker: 'Tuần lễ Fantasy',
    title: (
      <>
        Bộ sưu tập <em>rồng &amp; phép thuật</em>
      </>
    ),
    cta: 'Khám phá',
  },
  {
    href: '/tim-kiem?q=tarot',
    image: '/img/promo-astrology.jpg',
    kicker: 'Chiêm tinh & Tarot',
    title: (
      <>
        Đọc vị <em>các vì sao</em>
      </>
    ),
    cta: 'Xem bộ bài',
  },
];

/** Banner khuyến mãi (trang chủ khối 6) */
export function PromoBanners() {
  return (
    <section className="sec">
      <div className={`wrap ${styles.promos}`}>
        {PROMOS.map((promo) => (
          <Link key={promo.href} href={promo.href} className={styles.promo} data-reveal="">
            <Image src={promo.image} alt="" fill sizes="(max-width: 900px) 100vw, 610px" />
            <small>{promo.kicker}</small>
            <h3>{promo.title}</h3>
            <span className="more">{promo.cta} →</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
