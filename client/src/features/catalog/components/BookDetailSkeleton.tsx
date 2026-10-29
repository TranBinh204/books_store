import styles from './BookDetail.module.css';

/** Khung giữ chỗ trang chi tiết sách khi đang tải (kiểu `.o-skel` của demo) */
export function BookDetailSkeleton() {
  return (
    <div className={`container-page ${styles.page}`} aria-busy="true">
      <div
        className="o-skel"
        style={{ width: 320, maxWidth: '100%', height: 20, margin: '12px 0' }}
      />
      <div className={`surface ${styles.skMain}`}>
        <div className="o-skel" style={{ aspectRatio: '1' }} />
        <div className={styles.skCol}>
          <div className="o-skel" style={{ height: 18, width: 160 }} />
          <div className="o-skel" style={{ height: 44 }} />
          <div className="o-skel" style={{ height: 44, width: '60%' }} />
          <div className="o-skel" style={{ height: 84 }} />
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="o-skel" style={{ height: 26 }} />
          ))}
          <div className="o-skel" style={{ height: 54, width: 320, maxWidth: '100%' }} />
        </div>
      </div>
      <div className="o-skel" style={{ height: 220 }} />
    </div>
  );
}
