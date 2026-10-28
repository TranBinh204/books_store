import styles from './PasswordStrength.module.css';

const LEVELS = ['Rất yếu', 'Yếu', 'Khá', 'Mạnh', 'Rất mạnh'] as const;

const RULES = [
  { label: '≥ 8 ký tự', test: (v: string) => v.length >= 8 },
  { label: 'Có chữ', test: (v: string) => /[A-Za-z]/.test(v) },
  { label: 'Có số', test: (v: string) => /\d/.test(v) },
] as const;

/** 0–4: mỗi điều kiện đạt +1, thêm 1 khi dài ≥ 12 hoặc có ký tự đặc biệt / chữ hoa lẫn thường */
function score(value: string) {
  if (!value) return 0;
  const base = RULES.filter((rule) => rule.test(value)).length;
  const bonus =
    value.length >= 12 ||
    /[^A-Za-z0-9]/.test(value) ||
    (/[a-z]/.test(value) && /[A-Z]/.test(value));
  return Math.min(4, base + (base === RULES.length && bonus ? 1 : 0));
}

/** Gợi ý độ mạnh mật khẩu (chỉ ở client, không chặn gửi — luật thật do schema / server) */
export function PasswordStrength({ value }: { value: string }) {
  const level = score(value);
  return (
    <div className={styles.box} data-level={level}>
      <div className={styles.bar} aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <i key={step} data-on={level >= step} />
        ))}
      </div>
      <p className={styles.state} aria-live="polite">
        {value ? `Độ mạnh: ${LEVELS[level]}` : 'Độ mạnh mật khẩu'}
      </p>
      <ul className={styles.rules}>
        {RULES.map((rule) => (
          <li key={rule.label} data-ok={rule.test(value)}>
            <span aria-hidden="true">✦</span> {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
