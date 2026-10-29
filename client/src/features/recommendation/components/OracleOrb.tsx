import styles from './OracleOrb.module.css';

/**
 * Quả cầu tiên tri 3D **tĩnh** (design-system 8.3): sương, bụi sao, viền khúc xạ, đốm sáng vẽ 1 lần;
 * hover thì phóng nhẹ; `thinking` thì phập phồng. `onClick`: bấm vào quả cầu để hỏi (khách hàng).
 */
export function OracleOrb({
  thinking = false,
  onClick,
  label,
}: {
  thinking?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  const stage = (
    <div className={styles.stage}>
      <div className={styles.ball}>
        <div className={`${styles.mist} ${styles.m3}`} />
        <div className={`${styles.mist} ${styles.m1}`} />
        <div className={`${styles.mist} ${styles.m2}`} />
        <span className={styles.txt}>✦</span>
        <div className={styles.rim} />
        <div className={styles.gloss} />
      </div>
      <div className={styles.sparks} aria-hidden="true">
        <i className={styles.s1} />
        <i className={styles.s2} />
        <i className={styles.s3} />
      </div>
    </div>
  );

  return (
    <div className={`${styles.wrap} ${thinking ? styles.thinking : ''}`} data-reveal="">
      {onClick ? (
        <button type="button" onClick={onClick} className={styles.clickable} aria-label={label}>
          {stage}
        </button>
      ) : (
        stage
      )}
      <div className={styles.shadow} aria-hidden="true" />
      {/* chân đồng 3 móng */}
      <svg className={styles.stand} viewBox="0 0 220 90" aria-hidden="true">
        <defs>
          <linearGradient id="orb-bronze" x1="0" x2="1">
            <stop offset="0" stopColor="#5a3d1e" />
            <stop offset=".35" stopColor="#c9a46a" />
            <stop offset=".55" stopColor="#e2c48f" />
            <stop offset="1" stopColor="#4a3018" />
          </linearGradient>
          <linearGradient id="orb-bronze-v" y1="0" y2="1" x1="0" x2="0">
            <stop offset="0" stopColor="#c9a46a" />
            <stop offset="1" stopColor="#4a3018" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#orb-bronze-v)" strokeWidth="6" strokeLinecap="round">
          <path d="M78 62C62 48 56 30 66 10" />
          <path d="M142 62c16-14 22-32 12-52" />
        </g>
        <path d="M110 60V14" stroke="url(#orb-bronze-v)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="66" cy="10" r="4" fill="#e2c48f" />
        <circle cx="154" cy="10" r="4" fill="#e2c48f" />
        <circle cx="110" cy="14" r="3.5" fill="#e2c48f" />
        <path d="M62 58h96l16 20H46z" fill="url(#orb-bronze)" />
        <path d="M70 66h80" stroke="#3a2612" strokeWidth="1.5" strokeDasharray="2 5" />
        <ellipse cx="110" cy="80" rx="76" ry="8" fill="url(#orb-bronze)" />
        <ellipse
          cx="110"
          cy="78"
          rx="70"
          ry="4"
          fill="none"
          stroke="rgba(255,240,210,.35)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
