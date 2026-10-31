'use client';

import { useMediaQuery } from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import { AdminTag } from '@/components/ui/AdminTag';
import { OrderStatusChip } from '@/features/order';
import { formatDateTime, formatPrice } from '@/lib/format';
import { PAYMENT_METHOD_SHORT } from '../labels';
import type { AdminOrderRow } from '../types';
import styles from './AdminOrderTable.module.css';
import { PaymentStatusChip } from './PaymentStatusChip';

export const adminOrderHref = (id: number) => `/admin/don-hang/${id}`;

/** Đơn Chờ xác nhận quá 24 giờ → tag "Trễ" (docs/06-ui-ux/admin/08-don-hang.md Q4) */
const LATE_MS = 24 * 60 * 60 * 1000;
const isLate = (row: AdminOrderRow) =>
  row.status === 'PENDING' && Date.now() - new Date(row.createdAt).getTime() > LATE_MS;

const columns: GridColDef<AdminOrderRow>[] = [
  {
    field: 'code',
    headerName: 'Mã đơn',
    width: 170,
    renderCell: ({ row }) => (
      <div className={styles.codeCell}>
        <span className={styles.code}>{row.code}</span>
        <span className={styles.sub}>{formatDateTime(row.createdAt)}</span>
        <span className={`${styles.sub} ${styles.narrowOnly}`}>{row.recipientName}</span>
      </div>
    ),
  },
  {
    field: 'recipientName',
    headerName: 'Khách hàng',
    flex: 1,
    minWidth: 180,
    renderCell: ({ row }) => (
      <div className={styles.customerCell}>
        <span className="truncate text-bone">{row.recipientName}</span>
        <span className={styles.sub}>{row.recipientPhone}</span>
      </div>
    ),
  },
  { field: 'itemCount', headerName: 'SL', width: 60, align: 'center', headerAlign: 'center' },
  {
    field: 'total',
    headerName: 'Tổng tiền',
    width: 120,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => <span className={styles.total}>{formatPrice(row.total)}</span>,
  },
  {
    field: 'paymentMethod',
    headerName: 'Phương thức',
    width: 110,
    renderCell: ({ row }) => <b className="text-bone">{PAYMENT_METHOD_SHORT[row.paymentMethod]}</b>,
  },
  {
    field: 'paymentStatus',
    headerName: 'TT thanh toán',
    width: 160,
    renderCell: ({ row }) => (
      <div className={styles.wide}>
        <PaymentStatusChip status={row.paymentStatus} />
      </div>
    ),
  },
  {
    field: 'status',
    headerName: 'Trạng thái',
    width: 230,
    renderCell: ({ row }) => (
      <div className={styles.payCell}>
        <span className={styles.nowrap}>
          <OrderStatusChip status={row.status} />
          {isLate(row) && (
            <span className={styles.late}>
              <AdminTag tone="bad">Trễ</AdminTag>
            </span>
          )}
        </span>
        <span className={styles.narrowOnly}>
          <PaymentStatusChip status={row.paymentStatus} />
        </span>
      </div>
    ),
  },
];

/** Bảng đơn hàng Admin (phân trang server) — dùng ở /admin/don-hang và chi tiết khách hàng */
export function AdminOrderTable({
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
}: {
  rows: AdminOrderRow[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
}) {
  const router = useRouter();
  const narrow = useMediaQuery('(max-width: 899px)');
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      columnVisibilityModel={{
        recipientName: !narrow,
        itemCount: !narrow,
        paymentMethod: !narrow,
        paymentStatus: !narrow,
      }}
      rowCount={total}
      loading={loading}
      paginationMode="server"
      paginationModel={pagination}
      onPaginationModelChange={onPaginationChange}
      pageSizeOptions={[pagination.pageSize]}
      onRowClick={({ row }) => router.push(adminOrderHref(row.id))}
      rowHeight={narrow ? 84 : 64}
      disableRowSelectionOnClick
      disableColumnMenu
      disableColumnSorting
      autoHeight
      localeText={{ noRowsLabel: 'Không có đơn hàng phù hợp' }}
      sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
    />
  );
}
