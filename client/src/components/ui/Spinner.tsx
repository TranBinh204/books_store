import styles from './Spinner.module.css';

/** Chờ tải: dấu ✦ vàng xoay (thay vòng xoay MUI). `fill` → chiếm cả vùng nội dung và căn giữa */
export function Spinner({ fill = false }: { fill?: boolean }) {
  return (
    <div
      className={fill ? `${styles.wrap} ${styles.fill}` : styles.wrap}
      role="status"
      aria-label="Đang tải"
    >
      <span aria-hidden="true">✦</span>
    </div>
  );
}
