import { BookCard } from '@/components/shop/BookCard';
import type { Recommendation } from '../types';
import styles from './RecommendationPage.module.css';

/** Lưới gợi ý: thẻ sách + ô "Lời tiên tri" (lý do AI) bên dưới */
export function RecommendationList({ items }: { items: Recommendation[] }) {
  return (
    <ul className={styles.list} data-stagger="deal">
      {items.map(({ book, reason }) => (
        <li key={book.id} className={styles.item}>
          <div className={styles.card}>
            <BookCard book={book} />
          </div>
          {reason && (
            <p className={styles.prophecy}>
              <b>✦ Lời tiên tri: </b>
              {reason}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
