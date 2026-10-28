import styles from './ResultMark.module.css';

export type ResultTone = 'ok' | 'fail' | 'unknown' | 'wait' | 'mail';

const SPARKS = Array.from({ length: 10 }, (_, i) => i * 36);

/**
 * Biểu tượng kết quả: vòng tròn nét mảnh + dấu bên trong.
 * `ok` có hiệu ứng vào: vòng vẽ ra, dấu ✓ vẽ theo, vầng sáng toả và các tia ✦ bắn ra một lần.
 */
export function ResultMark({ tone }: { tone: ResultTone }) {
  return (
    <span className={styles.mark} data-tone={tone} aria-hidden="true">
      {(tone === 'ok' || tone === 'mail') && (
        <>
          <span className={styles.halo} />
          {SPARKS.map((angle) => (
            <i
              key={angle}
              className={styles.spark}
              style={{ '--a': `${angle}deg`, '--d': `${angle % 72 === 0 ? 74 : 62}px` } as never}
            >
              ✦
            </i>
          ))}
        </>
      )}
      {tone === 'wait' ? (
        <span className={styles.spin}>✦</span>
      ) : (
        <svg viewBox="0 0 72 72" width="72" height="72" fill="none" strokeLinecap="round">
          <circle className={styles.ring} cx="36" cy="36" r="33" strokeWidth="2" pathLength="1" />
          {tone === 'ok' && (
            <path
              className={styles.sign}
              d="M22 37l10 10 18-21"
              strokeWidth="4"
              strokeLinejoin="round"
              pathLength="1"
            />
          )}
          {tone === 'fail' && (
            <path
              className={styles.sign}
              d="M26 26l20 20M46 26L26 46"
              strokeWidth="4"
              pathLength="1"
            />
          )}
          {tone === 'mail' && (
            <path
              className={styles.sign}
              d="M20 27h32v20H20zM20 27l16 12 16-12"
              strokeWidth="3.5"
              strokeLinejoin="round"
              pathLength="1"
            />
          )}
          {tone === 'unknown' && (
            <path
              className={styles.sign}
              d="M29 29c0-4 3-7 7-7s7 3 7 7c0 5-7 6-7 11M36 49v.5"
              strokeWidth="4"
              pathLength="1"
            />
          )}
        </svg>
      )}
    </span>
  );
}
