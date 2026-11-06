'use client';

import {
  Alert,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconBolt, IconCancel, IconEdit, IconPlus, IconTrash } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { UsageBar } from '@/components/ui/UsageBar';
import { errorMessage } from '@/lib/form';
import { formatDateTime, formatPrice } from '@/lib/format';
import {
  useAdminFlashSales,
  useDeleteFlashSale,
  useStopFlashSale,
} from '../hooks/useAdminFlashSales';
import { FLASH_SALE_STATUS_TAG, type AdminFlashSale, type FlashSaleStatus } from '../types';
import styles from './FlashSaleList.module.css';
import { FlashSaleStatusTag } from './FlashSaleStatusTag';

const STATUSES = Object.keys(FLASH_SALE_STATUS_TAG) as FlashSaleStatus[];
const editHref = (id: number) => `/admin/flash-sale/${id}`;

/** Trang /admin/flash-sale (M12 mục 4.6) */
export function FlashSaleList() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const stop = useStopFlashSale();
  const remove = useDeleteFlashSale();
  const narrow = useMediaQuery('(max-width: 899px)');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [status, setStatus] = useState<FlashSaleStatus | ''>('');
  const [stopping, setStopping] = useState<AdminFlashSale | null>(null);
  const [deleting, setDeleting] = useState<AdminFlashSale | null>(null);

  const sales = useAdminFlashSales({
    status: status || undefined,
    page: pagination.page + 1,
    limit: pagination.pageSize,
  });

  const onError = (error: unknown) => enqueueSnackbar(errorMessage(error), { variant: 'error' });

  const confirmStop = () => {
    if (!stopping) return;
    stop.mutate(stopping.id, {
      onSuccess: () => enqueueSnackbar(`Đã dừng "${stopping.name}"`, { variant: 'success' }),
      onError,
      onSettled: () => setStopping(null),
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => enqueueSnackbar(`Đã xoá "${deleting.name}"`, { variant: 'success' }),
      onError,
      onSettled: () => setDeleting(null),
    });
  };

  const columns: GridColDef<AdminFlashSale>[] = [
    {
      field: 'name',
      headerName: 'Chương trình',
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => (
        <span className={styles.nameCell}>
          <Link href={editHref(row.id)} className={styles.name}>
            {row.status === 'ACTIVE' && <IconBolt width={14} className={styles.live} />}
            {row.name}
          </Link>
          <span className={styles.timeSub}>
            {formatDateTime(row.startAt)} → {formatDateTime(row.endAt)}
          </span>
        </span>
      ),
    },
    {
      field: 'startAt',
      headerName: 'Thời gian',
      width: 160,
      renderCell: ({ row }) => (
        <span className={styles.time}>
          <span>{formatDateTime(row.startAt)}</span>
          <span>→ {formatDateTime(row.endAt)}</span>
        </span>
      ),
    },
    {
      field: 'itemCount',
      headerName: 'Số sách',
      width: 90,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'totalSold',
      headerName: 'Đã bán / suất',
      width: 150,
      renderCell: ({ row }) => (
        <span className={styles.cell}>
          <span>
            {row.totalSold} / {row.totalQuantity}
          </span>
          <UsageBar used={row.totalSold} limit={row.totalQuantity} />
        </span>
      ),
    },
    {
      field: 'revenue',
      headerName: 'Doanh thu',
      width: 140,
      renderCell: ({ row }) => <span className={styles.revenue}>{formatPrice(row.revenue)}</span>,
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 150,
      renderCell: ({ row }) => (
        <span className={styles.actions}>
          <FlashSaleStatusTag status={row.status} />
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <span className={styles.actions} onClick={(event) => event.stopPropagation()}>
          <Tooltip title="Sửa">
            <IconButton
              size="small"
              component={Link}
              href={editHref(row.id)}
              aria-label={`Sửa ${row.name}`}
            >
              <IconEdit width={18} />
            </IconButton>
          </Tooltip>
          {row.status === 'ACTIVE' && (
            <Tooltip title="Dừng chương trình">
              <IconButton
                size="small"
                color="warning"
                aria-label={`Dừng ${row.name}`}
                onClick={() => setStopping(row)}
              >
                <IconCancel width={18} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip
            title={row.orderCount > 0 ? 'Đã có đơn mua giá sale — không xoá được' : 'Xoá'}
          >
            <span>
              <IconButton
                size="small"
                color="error"
                aria-label={`Xoá ${row.name}`}
                disabled={row.orderCount > 0}
                onClick={() => setDeleting(row)}
              >
                <IconTrash width={18} />
              </IconButton>
            </span>
          </Tooltip>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Flash Sale"
        description="Giảm giá sách theo khung giờ, số suất có hạn — các chương trình đang bật không được chồng giờ"
        actions={
          <Button
            variant="contained"
            className="a-action"
            aria-label="Thêm chương trình"
            startIcon={<IconPlus width={18} />}
            component={Link}
            href="/admin/flash-sale/moi"
          >
            <span>Thêm chương trình</span>
          </Button>
        }
      />
      <div className="a-panel">
        <div className={styles.statusRow}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={status}
            onChange={(_event, value: FlashSaleStatus | '' | null) => {
              if (value === null) return;
              setStatus(value);
              setPagination((current) => ({ ...current, page: 0 }));
            }}
            aria-label="Lọc theo trạng thái"
            className={styles.group}
          >
            <ToggleButton value="">Tất cả</ToggleButton>
            {STATUSES.map((value) => (
              <ToggleButton key={value} value={value}>
                {FLASH_SALE_STATUS_TAG[value].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>

        {sales.isError && (
          <Alert severity="error" className="mb-3">
            {errorMessage(sales.error)}
          </Alert>
        )}
        <DataGrid
          rows={sales.data?.items ?? []}
          columns={columns}
          columnVisibilityModel={{ startAt: !narrow, itemCount: !narrow, revenue: !narrow }}
          rowCount={sales.data?.meta?.total ?? 0}
          loading={sales.isFetching}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
          onRowClick={({ row }) => router.push(editHref(row.id))}
          rowHeight={narrow ? 72 : 60}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          autoHeight
          localeText={{
            noRowsLabel: status ? 'Không có chương trình phù hợp' : 'Chưa có chương trình nào',
          }}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </div>

      <ConfirmDialog
        open={stopping !== null}
        title="Dừng chương trình"
        content={
          <>
            Dừng <strong>{stopping?.name}</strong> ngay bây giờ? Sách sẽ về giá thường.
          </>
        }
        confirmText="Dừng"
        danger
        loading={stop.isPending}
        onConfirm={confirmStop}
        onClose={() => setStopping(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Xoá chương trình"
        content={
          <>
            Xoá <strong>{deleting?.name}</strong>? Thao tác này không hoàn tác được.
          </>
        }
        confirmText="Xoá"
        danger
        loading={remove.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
