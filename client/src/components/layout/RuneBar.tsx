import styles from './RuneBar.module.css';

/**
 * Câu chạy trên thanh đỏ — viết cứng (components.md Q3). Không ghi mã voucher cụ thể
 * vì mã có thể hết hạn (trang chủ mục 6).
 */
const RUNES = [
  'Miễn phí giao hàng toàn quốc cho mọi đơn',
  'Lời nguyền nửa đêm: Flash Sale giảm sâu mỗi ngày',
  'Lưu mã giảm giá ở mục Cuộn bùa trên trang chủ',
  'Hỏi quả cầu tiên tri để nhận gợi ý sách hợp gu',
];

/** Thanh chạy chữ trên cùng — danh sách nhân đôi để chạy liền mạch (translateX -50%) */
export function RuneBar() {
  return (
    <div className={styles.runes} data-pausable>
      <p className="sr-only">{RUNES.join('. ')}</p>
      <div className={styles.track} aria-hidden="true">
        {[...RUNES, ...RUNES].map((text, i) => (
          <span key={i}>{text}</span>
        ))}
      </div>
    </div>
  );
}
