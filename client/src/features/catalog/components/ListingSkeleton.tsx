import { BookCardSkeleton } from '@/components/shop/BookCardSkeleton';
import styles from './Listing.module.css';

/**
 * Khung giữ chỗ trang danh mục / tìm kiếm khi đang tải — cùng kiểu `.o-skel` của thẻ sách
 * (khung gạch đứt, sọc tím chéo nhấp nháy), cao bằng thật để không giật bố cục.
 */
export function ListingSkeleton({ withFilters = true }: { withFilters?: boolean }) {
  return (
    <div className="wrap pb-10" aria-hidden="true">
      <div className={styles.skCrumb} />
      <div className={`o-skel ${styles.skHero}`} />
      {withFilters && <div className={styles.skChips} />}
      <div className={`${styles.body} ${withFilters ? '' : styles.single}`}>
        {withFilters && (
          <aside className={styles.aside}>
            <div className={`o-skel ${styles.skFilters}`} />
          </aside>
        )}
        <div className={styles.main}>
          <div className={styles.skToolbar} />
          <div className={`${styles.grid} ${withFilters ? '' : styles.grid5}`}>
            {Array.from({ length: 10 }, (_, index) => (
              <BookCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
