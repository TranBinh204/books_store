import type { ReactNode } from 'react';
import { Fireflies } from '@/components/fx/Fireflies';
import styles from './AuthShell.module.css';

export type AuthGlyphKind = 'key' | 'book' | 'mail' | 'lock';

const GLYPHS: Record<AuthGlyphKind, ReactNode> = {
  key: (
    <>
      <circle pathLength="1" cx="26" cy="36" r="10" />
      <path pathLength="1" d="M36 36h24M52 36v9M60 36v6" />
    </>
  ),
  book: (
    <>
      <path
        pathLength="1"
        d="M36 22c-6-4-16-4-24-2v32c8-2 18-2 24 2 6-4 16-4 24-2V20c-8-2-18-2-24 2zM36 22v32"
      />
    </>
  ),
  mail: (
    <>
      <rect pathLength="1" x="12" y="20" width="48" height="32" rx="2" />
      <path pathLength="1" d="M12 22l24 18 24-18" />
    </>
  ),
  lock: (
    <>
      <rect pathLength="1" x="18" y="34" width="36" height="24" rx="3" />
      <path pathLength="1" d="M26 34V26a10 10 0 0 1 19-4M36 44v6" />
    </>
  ),
};

/** Biểu tượng nét mảnh vàng, vẽ ra khi vào trang */
export function AuthGlyph({ kind }: { kind: AuthGlyphKind }) {
  return (
    <svg
      className={styles.glyph}
      viewBox="0 0 72 72"
      width="72"
      height="72"
      fill="none"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g>{GLYPHS[kind]}</g>
    </svg>
  );
}

interface AuthShellProps {
  /** Biểu tượng nửa trái (AuthGlyph, hoặc ResultMark khi xong việc) */
  icon: ReactNode;
  /** Câu trích dưới biểu tượng */
  quote: string;
  chapter?: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Tăng số này để thẻ rung một lần (vd. đăng nhập sai) */
  shake?: number;
}

/**
 * Khung chung 4 trang tài khoản: thẻ tối hai nửa — trái "cánh cửa thư viện" (đom đóm + biểu tượng
 * + câu trích), phải biểu mẫu. ≤ 800px chỉ còn biểu tượng nhỏ trên tiêu đề.
 */
export function AuthShell({
  icon,
  quote,
  chapter = 'Tài khoản',
  title,
  description,
  children,
  footer,
  shake = 0,
}: AuthShellProps) {
  return (
    <div className={`wrap ${styles.page}`}>
      {/* a/b luân phiên để hoạt ảnh chạy lại mà không phải dựng lại biểu mẫu */}
      <section
        className={`surface ${styles.card}`}
        data-shake={shake === 0 ? undefined : shake % 2 ? 'a' : 'b'}
      >
        <div className={styles.art}>
          <Fireflies className={styles.flies} />
          <div className={styles.icon}>{icon}</div>
          <p className={styles.quote}>{quote}</p>
        </div>
        <div className={styles.body}>
          <p className="orn">{chapter}</p>
          <h1>{title}</h1>
          {description && <p className={styles.desc}>{description}</p>}
          {children}
          {footer && <div className={styles.foot}>{footer}</div>}
        </div>
      </section>
    </div>
  );
}
