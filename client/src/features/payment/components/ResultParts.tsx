import type { ReactNode } from 'react';
import { ResultMark, type ResultTone } from '@/components/ui/ResultMark';
import styles from './PaymentResult.module.css';

/** Thẻ kết quả giữa trang (thanh toán, đặt hàng thành công): dấu ✓ / ✕ + nhãn + tiêu đề */
export function ResultCard({
  tone,
  title,
  chapter = 'Kết quả thanh toán',
  children,
}: {
  tone: ResultTone;
  title: ReactNode;
  chapter?: string;
  children: ReactNode;
}) {
  return (
    <section className={`surface ${styles.card}`} data-tone={tone} role="status">
      <ResultMark tone={tone} />
      <p className="orn">{chapter}</p>
      <h1>{title}</h1>
      {children}
    </section>
  );
}

export function ResultMsg({ children }: { children: ReactNode }) {
  return <p className={styles.msg}>{children}</p>;
}

export function ResultActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

/** Phiếu giấy da: các dòng nhãn — giá trị; `strong` = số tiền nổi bật */
export function ResultTicket({
  rows,
}: {
  rows: { label: string; value: ReactNode; strong?: boolean }[];
}) {
  return (
    <div className={`parchment ${styles.ticket}`}>
      <dl>
        {rows.map((row) => (
          <div key={row.label} className={styles.row}>
            <dt>{row.label}</dt>
            <dd className={row.strong ? styles.amount : undefined}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
