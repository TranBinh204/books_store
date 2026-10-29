import type { ReactNode } from 'react';
import styles from './StatusPage.module.css';
import { StatusSearch } from './StatusSearch';

/** Cuốn sách mở trống; lạc lối: vài ✦ bay lên · lỗi: vệt khói bốc lên từ gáy sách */
function Illustration({ tone }: { tone: 'lost' | 'error' }) {
  return (
    <svg className={styles.art} viewBox="0 0 180 130" fill="none" aria-hidden="true">
      <g className={styles.book}>
        <path pathLength="1" d="M24 52Q64 38 90 56Q116 38 156 52V104Q116 90 90 108Q64 90 24 104Z" />
        <path pathLength="1" d="M90 56V108" />
        <path
          pathLength="1"
          d="M36 64Q60 58 78 66M36 76Q60 70 78 78M102 66Q120 58 144 64M102 78Q120 70 144 76"
        />
      </g>
      {tone === 'lost' ? (
        <g className={styles.sparks} fill="currentColor" stroke="none">
          <path d="m60 30 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
          <path d="m118 22 1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6Z" />
          <path d="m92 12 1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2Z" />
        </g>
      ) : (
        <path
          className={styles.smoke}
          pathLength="1"
          d="M90 52C80 44 100 38 90 30C82 24 96 18 90 10"
        />
      )}
    </svg>
  );
}

/** Dơi nhỏ vỗ cánh ở góc (ui.css `.bat`) */
function Bat() {
  return (
    <svg className={`bat ${styles.bat}`} viewBox="0 0 32 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M0 8Q6 0 12 6Q16 2 20 6Q26 0 32 8Q24 6 20 14Q16 8 12 14Q8 6 0 8Z"
      />
    </svg>
  );
}

/**
 * Trang trạng thái dùng chung (404, lỗi tải, lỗi hệ thống): hình minh hoạ vẽ nét · mã lớn ·
 * nhãn `.orn` · tiêu đề · mô tả · (ô tìm sách) · nút hành động.
 */
export function StatusPage({
  tone = 'lost',
  code,
  chapter,
  title,
  message,
  detail,
  showSearch = false,
  children,
}: {
  tone?: 'lost' | 'error';
  code: string;
  chapter: string;
  title: ReactNode;
  message: string;
  /** Dòng nhỏ mờ, vd. mã lỗi */
  detail?: string;
  showSearch?: boolean;
  /** Các nút hành động */
  children: ReactNode;
}) {
  return (
    <section className={styles.page} data-tone={tone}>
      <div className={styles.stage}>
        <Illustration tone={tone} />
        <Bat />
      </div>
      <p className={styles.code} aria-hidden="true">
        {code}
      </p>
      <p className="orn">{chapter}</p>
      <h1>{title}</h1>
      <p className={styles.msg}>{message}</p>
      {detail && <p className={styles.detail}>{detail}</p>}
      {showSearch && <StatusSearch />}
      <div className={styles.actions}>{children}</div>
    </section>
  );
}
