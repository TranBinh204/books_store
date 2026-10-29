'use client';

import { Skeleton } from '@mui/material';
import Link from 'next/link';
import { useBookList } from '../hooks/useBooks';
import styles from './StockSummary.module.css';

function SummaryCard({ stock, label }: { stock: 'low' | 'out'; label: string }) {
  // limit=1: chỉ đọc `meta.total`, không cần dữ liệu sách
  const { data, isPending } = useBookList({
    stock,
    sort: 'stock_asc',
    page: 1,
    limit: 1,
  });

  return (
    <Link href={`/admin/sach?stock=${stock}`} className={`a-panel ${styles.card}`}>
      <span className={styles.label}>{label}</span>
      {isPending ? (
        <Skeleton variant="rounded" width={72} height={40} />
      ) : (
        <span className={`${styles.value} ${stock === 'low' ? styles.low : styles.out}`}>
          {data?.meta?.total ?? 0}
        </span>
      )}
      <span className={styles.go}>đầu sách · Xem danh sách →</span>
    </Link>
  );
}

/** Hai thẻ số tình trạng kho (sách đang bán), bấm vào mở danh sách sách đã lọc */
export function StockSummary() {
  return (
    <div className={styles.grid}>
      <SummaryCard stock="low" label="Sắp hết hàng" />
      <SummaryCard stock="out" label="Hết hàng" />
    </div>
  );
}
