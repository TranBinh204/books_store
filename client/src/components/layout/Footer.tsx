import Link from 'next/link';
import { Silhouette } from '@/components/fx/Silhouette';
import styles from './Footer.module.css';
import { Logo } from './Logo';

/** Các cột link — thêm khi làm từng module */
const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  { title: 'Khám phá', links: [{ href: '/', label: 'Trang chủ' }] },
];

/** Footer cửa hàng (bản khung) */
export function Footer() {
  return (
    <footer className={styles.site} data-pausable>
      {/* Lâu đài sáng đèn đứng trên mép footer */}
      <Silhouette shape="castle-lit" hideOnMobile style={{ right: '4%', top: -118, width: 160 }} />
      <div className="wrap">
        <div className={styles.ft}>
          <div>
            <Logo plain />
            <p>Thư viện của những người mộng mơ.</p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h5>{column.title}</h5>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} BookStore · Dự án học tập</span>
        </div>
      </div>
    </footer>
  );
}
