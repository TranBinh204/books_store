import Link from 'next/link';
import { BookCover } from '@/components/shop/BookCover';
import { MiniBookRow } from '@/components/shop/MiniBookRow';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { AddToCartButton } from '@/features/cart/components/AddToCartButton';
import { isFlashSaleAvailable } from '@/features/flash-sale/types';
import { formatCompact, formatPrice } from '@/lib/format';
import type { BookCardItem } from '../../types/catalog.types';
import styles from './HallOfFame.module.css';

const ROMAN = ['I', 'II', 'III'];
const RANK_CLASS = [styles.p1, styles.p2, styles.p3];
/** Bục: hạng II – I – III (hạng I ở giữa, cao nhất) */
const PODIUM_ORDER = [1, 0, 2];

const authorsOf = (book: BookCardItem) => book.authors.map((a) => a.name).join(', ');
const priceOf = (book: BookCardItem) =>
  isFlashSaleAvailable(book.flashSale) ? book.flashSale.salePrice : book.price;

function Pod({ book, rank }: { book: BookCardItem; rank: number }) {
  return (
    <div className={`${styles.pod} ${RANK_CLASS[rank]}`} data-book={book.id}>
      {rank === 0 ? (
        <svg className={styles.crown} aria-hidden="true">
          <use href="#crown" />
        </svg>
      ) : (
        <span className={`${styles.crown} ${styles.star}`} aria-hidden="true">
          ✦
        </span>
      )}
      <Link href={`/sach/${book.id}`} className={styles.cv} data-cover>
        <BookCover
          url={book.coverUrl}
          alt={book.title}
          sizes="260px"
          seed={book.id}
          author={authorsOf(book)}
        />
      </Link>
      <div className={styles.step}>
        <div className={styles.rank}>{ROMAN[rank]}</div>
        <b>
          <Link href={`/sach/${book.id}`}>{book.title}</Link>
        </b>
        <small>
          {authorsOf(book)} · {formatCompact(book.soldCount)} đã bán
        </small>
        <div className={styles.buy}>
          <AddToCartButton
            bookId={book.id}
            title={book.title}
            variant="gold"
            label={`${formatPrice(priceOf(book))} · Mua`}
            disabled={book.stockStatus === 'OUT_OF_STOCK'}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Chương VI · "Bảng huyền thoại" (trang chủ khối 9): bục vinh danh 3 cuốn bán chạy nhất
 * (vương miện cho hạng I) + danh sách 2 cột hạng 4 → 11.
 */
export function HallOfFame({ books }: { books: BookCardItem[] }) {
  if (books.length === 0) return null;
  const top = books.slice(0, 3);
  const rest = books.slice(3);

  return (
    <section className="sec" id="hall" data-pausable>
      <div className="wrap">
        <SectionTitle
          chapter="Chương VI · Bán chạy"
          title={
            <>
              Bảng <em>huyền thoại</em>
            </>
          }
          action={{ href: '/tim-kiem?sort=sold_desc', label: 'Xem toàn bộ bảng' }}
        />
        <div className={styles.podium} data-stagger="">
          {PODIUM_ORDER.filter((rank) => top[rank]).map((rank) => (
            <Pod key={top[rank].id} book={top[rank]} rank={rank} />
          ))}
        </div>
        {rest.length > 0 && (
          <ol className={styles.list} data-stagger="">
            {rest.map((book, i) => (
              <li key={book.id}>
                <MiniBookRow
                  className={styles.row}
                  book={{ ...book, price: priceOf(book) }}
                  subtitle={authorsOf(book)}
                  before={<span className={styles.n}>{i + 4}</span>}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
