import Link from 'next/link';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbItem {
  label: string;
  /** Không có → mục hiện tại (không bấm được) */
  href?: string;
}

/** Trang chủ ✦ Danh mục cha ✦ Danh mục con ✦ ... */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const all = [{ label: 'Trang chủ', href: '/' }, ...items];
  return (
    <nav aria-label="Đường dẫn" className={styles.crumbs}>
      <ol>
        {all.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span className={styles.current} aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
