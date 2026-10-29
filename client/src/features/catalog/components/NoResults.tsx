import Link from 'next/link';
import { Parchment } from '@/components/shop/Parchment';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { listBooks } from '../api/catalog.api';
import { HOME_SECTION_LIMIT, HOT_KEYWORDS } from '../constants';
import { searchHref } from '../routes';
import { BookSlider } from './BookSlider';
import styles from './NoResults.module.css';

/**
 * Tìm theo từ khoá mà không ra sách (shop/03 mục 5): giấy da + cú, gợi ý cách tìm,
 * chip "Câu thần chú phổ biến", rồi khối Bảng huyền thoại (sách bán chạy).
 * Chỉ dựng khi thật sự không có kết quả nên mới gọi API sách bán chạy.
 */
export async function NoResults({ q }: { q: string }) {
  const bestsellers = await listBooks({ sort: 'sold_desc', limit: HOME_SECTION_LIMIT });
  return (
    <div>
      <Parchment className={styles.paper} contentClassName={styles.content} data-reveal="">
        <svg className={styles.owl} viewBox="0 0 64 64" aria-hidden="true">
          <use href="#owl" />
        </svg>
        <p className={styles.title}>Không tìm thấy sản phẩm nào phù hợp với “{q}”</p>
        <ul className={styles.tips}>
          <li>Kiểm tra lại chính tả của từ khoá</li>
          <li>Thử từ khoá ngắn hơn hoặc từ khoá khác (tên sách, tên tác giả, ISBN)</li>
        </ul>
        <div className={styles.spells}>
          <p className={styles.spellsHd}>Câu thần chú phổ biến</p>
          {HOT_KEYWORDS.map((word) => (
            <Link key={word} href={searchHref(word)} className={styles.spell}>
              {word}
            </Link>
          ))}
        </div>
        <Link href="/tim-kiem" className="btn btn-ink">
          Xem tất cả sản phẩm
        </Link>
      </Parchment>

      {bestsellers.items.length > 0 && (
        <section className={styles.legends}>
          <SectionTitle
            chapter="Bán chạy"
            title={
              <>
                Bảng <em>huyền thoại</em>
              </>
            }
            compact
          />
          <BookSlider books={bestsellers.items} label="Sách bán chạy" />
        </section>
      )}
    </div>
  );
}
