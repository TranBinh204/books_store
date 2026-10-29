import Link from 'next/link';
import { categoryHref } from '../routes';
import type { PublicCategory } from '../types/catalog.types';
import styles from './Listing.module.css';

/**
 * Chip danh mục: danh mục con (khi đang ở danh mục cha) hoặc danh mục cùng cha
 * (khi đang ở danh mục con — mục hiện tại sáng lên). Không có gì để chọn thì không vẽ.
 */
export function CategoryChips({
  items,
  currentId,
  label,
}: {
  items: PublicCategory[];
  currentId?: number;
  label: string;
}) {
  if (items.length === 0) return null;
  return (
    <nav className={`scroll-x ${styles.catChips}`} aria-label={label} data-reveal="">
      {items.map((item) => (
        <Link
          key={item.id}
          href={categoryHref(item.id)}
          className="chip chip-soft chip-lg"
          aria-current={item.id === currentId ? 'page' : undefined}
        >
          {item.name}
          <small className={styles.catCount}>({item.bookCount})</small>
        </Link>
      ))}
    </nav>
  );
}
