import type { ReactNode } from 'react';
import styles from './Dashboard.module.css';

/** Khung panel phẳng của Dashboard: tiêu đề (heading, gold-hi) + nút phụ bên phải */
export function Panel({
  title,
  action,
  className = '',
  children,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`a-panel ${className}`}>
      <div className={styles.panelHead}>
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
