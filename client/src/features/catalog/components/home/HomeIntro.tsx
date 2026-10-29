import { Silhouette } from '@/components/fx/Silhouette';
import { Parchment } from '@/components/shop/Parchment';
import styles from './HomeIntro.module.css';

/** Khối giới thiệu trên giấy da rách mép + lâu đài ma trên cành cây (trang chủ khối 2) */
export function HomeIntro() {
  return (
    <section className={`sec ${styles.intro}`} id="intro">
      <Silhouette shape="castle" hideOnMobile style={{ left: '4%', top: -60, width: 220 }} />
      <div className="wrap">
        <Parchment className={styles.paper} contentClassName={styles.content} data-reveal="">
          <h2>Bước vào thế giới ngoài trang giấy</h2>
          <p>
            BookStore mở một góc riêng cho những người mê đọc: tuyển chọn sách hay, bìa đẹp, giá
            tốt, giao miễn phí toàn quốc. Chúng tôi muốn nơi này giống một{' '}
            <i>lối vào thế giới truyện</i> hơn là một kệ hàng.
          </p>
          <em>“Ở đây, câu chuyện không chỉ để đọc, mà để sống cùng.”</em>
        </Parchment>
      </div>
    </section>
  );
}
