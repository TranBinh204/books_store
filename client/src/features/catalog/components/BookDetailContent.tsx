import Link from 'next/link';
import { Fragment, cache, type ReactNode } from 'react';
import { Silhouette } from '@/components/fx/Silhouette';
import { Breadcrumb } from '@/components/shop/Breadcrumb';
import { PriceTag } from '@/components/shop/PriceTag';
import { Seal } from '@/components/shop/Seal';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { FlashSaleStrip } from '@/features/flash-sale/components/FlashSaleStrip';
import { isFlashSaleAvailable } from '@/features/flash-sale/types';
import { orNotFound } from '@/lib/not-found';
import { getBook, getRelatedBooks } from '../api/catalog.api';
import { categoryHref } from '../routes';
import type { CoverType, PublicBookDetail, StockStatus } from '../types/catalog.types';
import styles from './BookDetail.module.css';
import { BookGallery } from './BookGallery';
import { BookPurchase } from './BookPurchase';
import { BookRatingLink } from './BookRatingLink';
import { BookSlider } from './BookSlider';
import { BookTabs } from './BookTabs';

/** Lấy sách (ẩn / không có → 404). `cache`: trang & generateMetadata dùng chung 1 lần gọi */
export const loadBook = cache((id: number) => orNotFound(getBook(id)));

export const authorHref = (id: number) => `/tim-kiem?authorId=${id}`;

/** Tình trạng kho: `low` kèm "Chỉ còn N cuốn" */
const STOCK_LABELS: Record<StockStatus, { label: string; className: string }> = {
  IN_STOCK: { label: 'Còn hàng', className: styles.in },
  LOW_STOCK: { label: 'Sắp hết hàng', className: styles.low },
  OUT_OF_STOCK: { label: 'Hết hàng', className: styles.out },
};

const COVER_LABELS: Record<CoverType, string> = {
  PAPERBACK: 'Bìa mềm',
  HARDCOVER: 'Bìa cứng',
};

/** Icon nét mảnh vẽ tại chỗ (đồng nhất với bộ icon SVG của demo) */
const COMMITMENTS: { label: string; path: ReactNode }[] = [
  {
    label: 'Hàng chính hãng',
    path: (
      <>
        <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    label: 'Miễn phí giao hàng toàn quốc',
    path: (
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
        <circle cx="7" cy="17" r="1.8" />
        <circle cx="17" cy="17" r="1.8" />
      </>
    ),
  },
  {
    label: 'Kiểm tra hàng khi nhận',
    path: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M9 9l1.5 1.5L14 7M9 15h6" />
      </>
    ),
  },
];

/** Bảng thông tin — bỏ dòng không có dữ liệu */
function specRows(book: PublicBookDetail): [string, ReactNode][] {
  const rows: [string, ReactNode | null][] = [
    [
      'Tác giả',
      book.authors.length > 0
        ? book.authors.map((author, index) => (
            <Fragment key={author.id}>
              {index > 0 && ', '}
              <Link href={authorHref(author.id)}>{author.name}</Link>
            </Fragment>
          ))
        : null,
    ],
    ['Nhà xuất bản', book.publisher?.name ?? null],
    ['Năm xuất bản', book.publishYear],
    ['Số trang', book.pages],
    ['Kích thước', book.size],
    ['Trọng lượng', book.weightGram ? `${book.weightGram} g` : null],
    ['Loại bìa', book.coverType ? COVER_LABELS[book.coverType] : null],
    ['ISBN', book.isbn],
    [
      'Danh mục',
      <Link key="category" href={categoryHref(book.category.id)}>
        {book.category.name}
      </Link>,
    ],
  ];
  return rows.filter((row): row is [string, ReactNode] => row[1] !== null && row[1] !== undefined);
}

/**
 * Trang chi tiết sách /sach/[id] (Server Component — SEO), shop/04:
 * breadcrumb · khối sách (ảnh trái; tên, tác giả, giá, bảng thông tin, mua hàng, cam kết phải)
 * · tab Mô tả / Đánh giá trên giấy da · sách liên quan.
 */
export async function BookDetailContent({ id }: { id: number }) {
  // Gọi song song; API "liên quan" cũng trả 404 khi sách ẩn → cùng về trang not-found
  const [book, related] = await Promise.all([loadBook(id), orNotFound(getRelatedBooks(id))]);
  const stock = STOCK_LABELS[book.stockStatus];
  const { category, flashSale } = book;
  const activeFlash = isFlashSaleAvailable(flashSale) ? flashSale : null;
  const price = activeFlash?.salePrice ?? book.price;

  return (
    <div className={`container-page ${styles.page}`}>
      <Breadcrumb
        items={[
          ...(category.parent
            ? [{ label: category.parent.name, href: categoryHref(category.parent.id) }]
            : []),
          { label: category.name, href: categoryHref(category.id) },
          { label: book.title },
        ]}
      />

      <section className={`surface corners ${styles.main}`} data-reveal="">
        <Silhouette shape="branch" hideOnMobile className={styles.decor} />
        <BookGallery
          images={book.images}
          title={book.title}
          seal={
            <Seal
              flashPercent={activeFlash?.discountPercent}
              isNew={book.isNew}
              discountPercent={book.discountPercent}
              outOfStock={book.stockStatus === 'OUT_OF_STOCK'}
            />
          }
        />

        <div className={styles.info}>
          <p className={`orn ${styles.orn}`}>
            <Link href={categoryHref(category.id)}>{category.name}</Link>
          </p>
          <h1 className={styles.title}>{book.title}</h1>
          {book.authors.length > 0 && (
            <p className={styles.by}>
              bởi{' '}
              {book.authors.map((author, index) => (
                <Fragment key={author.id}>
                  {index > 0 && ', '}
                  <Link href={authorHref(author.id)}>{author.name}</Link>
                </Fragment>
              ))}
            </p>
          )}
          <BookRatingLink average={book.ratingAvg} count={book.ratingCount} />

          <div className={styles.priceBox}>
            {flashSale && <FlashSaleStrip flashSale={flashSale} />}
            <div className={styles.priceBody}>
              <PriceTag price={price} originalPrice={book.originalPrice} variant="detail" />
              {activeFlash && (
                <p className={styles.limit}>
                  Tối đa {activeFlash.perUserLimit} cuốn giá Flash Sale / khách
                </p>
              )}
            </div>
          </div>

          <p className={`${styles.stock} ${stock.className}`}>
            {stock.label}
            {book.stockStatus === 'LOW_STOCK' && ` · Chỉ còn ${book.maxQuantity} cuốn`}
          </p>

          <table className={styles.specs}>
            <tbody>
              {specRows(book).map(([label, value]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <BookPurchase
            bookId={book.id}
            maxQuantity={book.maxQuantity}
            title={book.title}
            price={price}
          />

          <ul className={styles.promises}>
            {COMMITMENTS.map(({ label, path }) => (
              <li key={label}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {path}
                </svg>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <BookTabs
        book={{ id: book.id, title: book.title, image: book.coverUrl }}
        description={book.description}
        ratingCount={book.ratingCount}
      />

      {related.length > 0 && (
        <section className={styles.related}>
          <SectionTitle
            chapter="Cùng vương quốc"
            title={
              <>
                Sách <em>liên quan</em>
              </>
            }
            action={{ href: categoryHref(category.id), label: 'Xem cả danh mục' }}
            compact
          />
          <BookSlider books={related} />
        </section>
      )}
    </div>
  );
}
