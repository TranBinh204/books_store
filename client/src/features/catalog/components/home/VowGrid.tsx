import type { ReactNode } from 'react';
import { SectionTitle } from '@/components/shop/SectionTitle';
import styles from './VowGrid.module.css';

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    {children}
  </svg>
);

/**
 * Cam kết — nội dung tĩnh, sửa cho đúng chính sách dự án (trang chủ mục 6):
 * miễn phí ship mọi đơn; đổi trả = liên hệ shop (M16 Q5).
 */
const VOWS = [
  {
    title: 'Giao miễn phí',
    desc: 'Toàn quốc, mọi đơn hàng',
    icon: svg(
      <>
        <path d="M4 14h26v20H4zM30 22h8l6 6v6H30" />
        <circle cx="12" cy="36" r="4" />
        <circle cx="36" cy="36" r="4" />
      </>,
    ),
  },
  {
    title: 'Sách chính hãng',
    desc: 'Từ các nhà xuất bản uy tín',
    icon: svg(
      <>
        <path d="M24 4 40 10v12c0 11-7 19-16 22C15 41 8 33 8 22V10z" />
        <path d="m17 24 5 5 9-10" />
      </>,
    ),
  },
  {
    title: 'Hỗ trợ đổi trả',
    desc: 'Liên hệ shop khi sách lỗi',
    icon: svg(
      <>
        <path d="M8 24a16 16 0 1 0 5-11.6" />
        <path d="M8 6v8h8" />
      </>,
    ),
  },
  {
    title: 'Gợi ý bằng AI',
    desc: 'Tìm cuốn hợp gu của bạn',
    icon: svg(<path d="M24 6l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" />),
  },
];

/** "Lời thề của BookStore" (trang chủ khối 14) */
export function VowGrid() {
  return (
    <section className="sec">
      <div className="wrap">
        <SectionTitle
          chapter="Cam kết"
          title={
            <>
              Lời thề của <em>BookStore</em>
            </>
          }
        />
        <div className={styles.grid} data-reveal="">
          {VOWS.map((vow) => (
            <div key={vow.title} className={styles.vow}>
              {vow.icon}
              <h4>{vow.title}</h4>
              <p>{vow.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
