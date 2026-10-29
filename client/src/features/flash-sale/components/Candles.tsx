import styles from './Candles.module.css';

/** 3 ngọn nến lay phía trên tiêu đề "Lời nguyền nửa đêm" */
export function Candles() {
  return (
    <div className={styles.candles} aria-hidden="true">
      <span className={styles.candle} />
      <span className={styles.candle} />
      <span className={styles.candle} />
    </div>
  );
}
