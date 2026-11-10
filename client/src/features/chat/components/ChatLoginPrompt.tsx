'use client';

import Link from 'next/link';
import type { BubbleSide } from '../hooks/useDraggableBubble';
import styles from './Chat.module.css';

/** Khách chưa đăng nhập bấm quả cầu → mời Đăng nhập / Đăng ký (Q1 — chatbox bắt buộc đăng nhập) */
export function ChatLoginPrompt({ side, onClose }: { side: BubbleSide; onClose: () => void }) {
  return (
    <section
      aria-label="Pháp sư thủ thư — trợ lý BookStore"
      className={`${styles.panel} ${styles.login} ${side === 'left' ? styles.left : styles.right}`}
    >
      <header className={styles.top}>
        <span className={styles.miniBall} aria-hidden="true" />
        <div>
          <b>Pháp sư thủ thư</b>
          <small>chờ lữ khách xưng danh…</small>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.topBtn} aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </div>
      </header>
      <div className={styles.loginBody}>
        <p>
          Ta chỉ trò chuyện với lữ khách đã xưng danh. Hãy đăng nhập để ta tìm sách, gợi ý theo sở
          thích và tra cứu đơn hàng cho ngươi.
        </p>
        <div className={styles.loginBtns}>
          <Link href="/dang-nhap" onClick={onClose} className="btn btn-gold btn-sm">
            Đăng nhập
          </Link>
          <Link href="/dang-ky" onClick={onClose} className="btn btn-ghost btn-sm">
            Đăng ký
          </Link>
        </div>
      </div>
    </section>
  );
}
