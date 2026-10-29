import { SectionTitle } from '@/components/shop/SectionTitle';
import type { PublicCategoryNode } from '../../types/catalog.types';
import styles from './RealmGrid.module.css';
import { TarotCard } from './TarotCard';

/** Số lá bài tối đa — demo 07 */
const MAX_REALMS = 9;

/** Chương I · "Chọn vương quốc của bạn": danh mục cấp 1 có sách, dạng lá bài tarot (trang chủ khối 3) */
export function RealmGrid({ categories }: { categories: PublicCategoryNode[] }) {
  const realms = categories.filter((c) => c.bookCount > 0).slice(0, MAX_REALMS);
  if (realms.length === 0) return null;

  return (
    <section className="sec" id="realms" data-pausable>
      <div className="wrap">
        <SectionTitle
          chapter="Chương I"
          title={
            <>
              Chọn <em>vương quốc</em> của bạn
            </>
          }
          subtitle="Di chuột lên lá bài để lật mở"
        />
        <div className={styles.realms} data-stagger="">
          {realms.map((category, index) => (
            <TarotCard key={category.id} category={category} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
