import Link from 'next/link';
import { Silhouette } from '@/components/fx/Silhouette';
import styles from './Footer.module.css';
import { Logo } from './Logo';

// Địa chỉ, hotline là nội dung tạm của demo — cập nhật khi có thông tin thật
const COLUMNS = [
  {
    title: 'Khám phá',
    links: [
      { href: '/tim-kiem?sort=created_desc', label: 'Sách mới' },
      { href: '/tim-kiem?sort=sold_desc', label: 'Bán chạy' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { href: '/tai-khoan/don-hang', label: 'Theo dõi đơn hàng' },
      { href: '/tai-khoan', label: 'Tài khoản của tôi' },
      { href: '/tai-khoan/yeu-thich', label: 'Sách yêu thích' },
      { href: '/gio-hang', label: 'Giỏ hàng' },
    ],
  },
];

/** Footer cửa hàng (components.md 2.2) — chỉ COD · VNPay (dự án không hỗ trợ Visa, Momo) */
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
          <div>
            <h5>Thanh toán</h5>
            <ul>
              <li>COD · VNPay</li>
              <li>Giao miễn phí toàn quốc</li>
            </ul>
          </div>
        </div>
        <div className={styles.bottom}>
          <span>© {new Date().getFullYear()} BookStore · Dự án học tập</span>
          <span>Ảnh nền: Unsplash</span>
        </div>
      </div>
    </footer>
  );
}
