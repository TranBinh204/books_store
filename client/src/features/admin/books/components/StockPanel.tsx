'use client';

import { Button } from '@mui/material';
import { useState } from 'react';
import { AdminTag } from '@/components/ui/AdminTag';
import { IconPlus, IconTune } from '@/components/ui/icons';
import type { BookDetail, StockStatus } from '../../catalog-types';
import { InventoryLogTable } from './InventoryLogTable';
import { StockDialog } from './StockDialog';
import styles from './StockPanel.module.css';

const STATUS_TAG: Record<StockStatus, { tone: 'ok' | 'warn' | 'bad'; label: string }> = {
  IN_STOCK: { tone: 'ok', label: 'Còn hàng' },
  LOW_STOCK: { tone: 'warn', label: 'Sắp hết' },
  OUT_OF_STOCK: { tone: 'bad', label: 'Hết hàng' },
};

/** Khối "Tồn kho" ở trang sửa sách: số hiện tại, Nhập hàng / Điều chỉnh, lịch sử gần đây */
export function StockPanel({ book }: { book: BookDetail }) {
  const [dialog, setDialog] = useState<'IMPORT' | 'ADJUST' | null>(null);
  const status = STATUS_TAG[book.stockStatus];

  return (
    <section className={styles.wrap}>
      <div className={`a-panel ${styles.summary}`}>
        <div>
          <div className={styles.label}>Tồn kho hiện tại</div>
          <div className={styles.number}>
            <b>{book.stock}</b>
            <AdminTag tone={status.tone}>{status.label}</AdminTag>
          </div>
          <div className={styles.sold}>Đã bán: {book.soldCount}</div>
        </div>
        <div className={styles.actions}>
          <Button
            variant="contained"
            startIcon={<IconPlus width={20} />}
            onClick={() => setDialog('IMPORT')}
          >
            Nhập hàng
          </Button>
          <Button
            variant="outlined"
            startIcon={<IconTune width={20} />}
            onClick={() => setDialog('ADJUST')}
          >
            Điều chỉnh
          </Button>
        </div>
      </div>

      <h2 className={styles.heading}>Lịch sử tồn kho</h2>
      <InventoryLogTable bookId={book.id} pageSize={10} />

      <StockDialog
        open={dialog !== null}
        type={dialog ?? 'IMPORT'}
        bookId={book.id}
        currentStock={book.stock}
        onClose={() => setDialog(null)}
      />
    </section>
  );
}
