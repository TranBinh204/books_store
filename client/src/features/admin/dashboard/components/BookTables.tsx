import { Button, Skeleton } from '@mui/material';
import Link from 'next/link';
import { BookCover } from '@/components/shop/BookCover';
import { formatPrice } from '@/lib/format';
import type { DashboardOverview, DashboardTasks } from '../types';
import styles from './Dashboard.module.css';
import { Panel } from './Panel';

function Cover({ url, title }: { url: string | null; title: string }) {
  return (
    <span className={styles.cover}>
      <BookCover url={url} alt={title} sizes="40px" />
    </span>
  );
}

/** Top 10 sách bán chạy trong khoảng (M14 quy tắc 7) */
export function TopBooksTable({ data }: { data: DashboardOverview | undefined }) {
  return (
    <Panel title="Top sách bán chạy">
      {!data ? (
        <Skeleton variant="rounded" height={280} />
      ) : data.topBooks.length === 0 ? (
        <p className={styles.empty}>Chưa bán được sách nào</p>
      ) : (
        <table className="a-table">
          <thead>
            <tr>
              <th className={styles.rank}>#</th>
              <th>Sách</th>
              <th className="a-right">Đã bán</th>
              <th className="a-right">Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {data.topBooks.map((book, index) => (
              <tr key={book.bookId}>
                <td className={styles.rank}>{index + 1}</td>
                <td>
                  <Link href={`/admin/sach/${book.bookId}`} className={styles.book}>
                    <Cover url={book.image} title={book.title} />
                    <span className={styles.clamp}>{book.title}</span>
                  </Link>
                </td>
                <td className="a-right">{book.quantity}</td>
                <td className="a-right">{formatPrice(book.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

/** Sách đang bán có tồn ≤ ngưỡng (M14 quy tắc 9) */
export function LowStockTable({ data }: { data: DashboardTasks | undefined }) {
  return (
    <Panel
      title={`Sách sắp hết hàng${data?.lowStock.total ? ` (${data.lowStock.total})` : ''}`}
      action={
        data && data.lowStock.total > data.lowStock.items.length ? (
          <Link href="/admin/sach?stock=low" className={styles.link}>
            Xem tất cả
          </Link>
        ) : undefined
      }
    >
      {!data ? (
        <Skeleton variant="rounded" height={280} />
      ) : data.lowStock.items.length === 0 ? (
        <p className={styles.empty}>Kho hàng đang đủ</p>
      ) : (
        <ul className={styles.stockList}>
          {data.lowStock.items.map((book) => (
            <li key={book.id}>
              <Cover url={book.coverUrl} title={book.title} />
              <span className={styles.clamp}>{book.title}</span>
              <span className={`${styles.stock} ${book.stock === 0 ? styles.stockOut : ''}`}>
                {book.stock === 0 ? 'Hết hàng' : `Còn ${book.stock}`}
              </span>
              <Button size="small" component={Link} href={`/admin/sach/${book.id}`}>
                Nhập kho
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
