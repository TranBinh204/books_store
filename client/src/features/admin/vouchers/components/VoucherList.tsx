'use client';

import {
  Alert,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  IconEdit,
  IconEye,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconTrash,
} from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { UsageBar } from '@/components/ui/UsageBar';
import { useDebounce } from '@/hooks/useDebounce';
import { errorMessage } from '@/lib/form';
import { formatDateTime, formatPrice } from '@/lib/format';
import { useAdminVouchers, useDeleteVoucher } from '../hooks/useAdminVouchers';
import {
  VOUCHER_STATUS_TAG,
  type AdminVoucher,
  type AdminVoucherParams,
  type VoucherStatus,
} from '../types';
import { VoucherFormDialog } from './VoucherFormDialog';
import styles from './VoucherList.module.css';
import { VoucherOrdersDialog } from './VoucherOrdersDialog';
import { VoucherStatusTag } from './VoucherStatusTag';

interface Filters {
  keyword: string;
  status: VoucherStatus | '';
  visibility: NonNullable<AdminVoucherParams['visibility']> | '';
}

const EMPTY_FILTERS: Filters = { keyword: '', status: '', visibility: '' };
const STATUSES = Object.keys(VOUCHER_STATUS_TAG) as VoucherStatus[];

/** "10%" / "50.000₫" */
function discountMain(voucher: AdminVoucher) {
  return voucher.discountType === 'FIXED'
    ? formatPrice(voucher.discountValue)
    : `${voucher.discountValue}%`;
}
/** "tối đa 30.000₫" — chỉ voucher % có trần */
function discountCap(voucher: AdminVoucher) {
  return voucher.discountType === 'PERCENT' && voucher.maxDiscount !== null
    ? `tối đa ${formatPrice(voucher.maxDiscount)}`
    : null;
}

/** Trang /admin/voucher (M11 mục 4.4) */
export function VoucherList() {
  const { enqueueSnackbar } = useSnackbar();
  const remove = useDeleteVoucher();
  const narrow = useMediaQuery('(max-width: 899px)');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  /** undefined = đóng · null = thêm mới */
  const [editing, setEditing] = useState<AdminVoucher | null | undefined>(undefined);
  const [viewingOrders, setViewingOrders] = useState<AdminVoucher | null>(null);
  const [deleting, setDeleting] = useState<AdminVoucher | null>(null);
  const q = useDebounce(filters.keyword.trim());

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 0 }));
  };
  const hasFilters = filters.keyword || filters.status || filters.visibility;

  const vouchers = useAdminVouchers({
    q: q || undefined,
    status: filters.status || undefined,
    visibility: filters.visibility || undefined,
    page: pagination.page + 1,
    limit: pagination.pageSize,
  });

  const confirmDelete = () => {
    if (!deleting) return;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        enqueueSnackbar(`Đã xoá voucher ${deleting.code}`, { variant: 'success' });
        setDeleting(null);
      },
      onError: (error) => {
        enqueueSnackbar(errorMessage(error), { variant: 'error' });
        setDeleting(null);
      },
    });
  };

  const columns: GridColDef<AdminVoucher>[] = [
    {
      field: 'code',
      headerName: 'Mã',
      flex: 1,
      minWidth: 170,
      renderCell: ({ row }) => (
        <span className={styles.codeCell}>
          <span className={styles.code}>{row.code}</span>
          <span className={styles.discountSub}>
            Giảm {discountMain(row)}
            {discountCap(row) && ` · ${discountCap(row)}`}
          </span>
          {row.description && (
            <span className={styles.desc} title={row.description}>
              {row.description}
            </span>
          )}
        </span>
      ),
    },
    {
      field: 'discountValue',
      headerName: 'Giảm',
      width: 150,
      renderCell: ({ row }) => (
        <span className={styles.cell}>
          <span className={styles.discount}>{discountMain(row)}</span>
          {discountCap(row) && <span className={styles.cap}>{discountCap(row)}</span>}
        </span>
      ),
    },
    {
      field: 'minOrderValue',
      headerName: 'Đơn tối thiểu',
      width: 130,
      valueFormatter: (value: number) => (value > 0 ? formatPrice(value) : '—'),
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
      field: 'usedCount',
      headerName: 'Đã dùng',
      width: 140,
      renderCell: ({ row }) => (
        <span className={styles.cell}>
          <span className={styles.usedLine}>
            {row.usedCount} / {row.usageLimit ?? '∞'}
            {row.isPublic && (
              <Tooltip title="Hiện ở trang chủ">
                <span aria-label="Công khai" className="inline-flex text-bone-2">
                  <IconEye width={16} />
                </span>
              </Tooltip>
            )}
          </span>
          <UsageBar used={row.usedCount} limit={row.usageLimit} />
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 140,
      renderCell: ({ row }) => (
        <span className={styles.actions}>
          <VoucherStatusTag status={row.status} />
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 130,
      sortable: false,
      renderCell: ({ row }) => (
        <span className={styles.actions}>
          <Tooltip title="Sửa">
            <IconButton size="small" aria-label={`Sửa ${row.code}`} onClick={() => setEditing(row)}>
              <IconEdit width={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Lượt dùng">
            <IconButton
              size="small"
              aria-label={`Lượt dùng ${row.code}`}
              onClick={() => setViewingOrders(row)}
            >
              <IconReceipt width={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.orderCount > 0 ? 'Đã có đơn dùng — không xoá được' : 'Xoá'}>
            <span>
              <IconButton
                size="small"
                color="error"
                aria-label={`Xoá ${row.code}`}
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
        title="Voucher"
        description="Mã giảm giá khách nhập ở trang thanh toán — mã công khai hiện ở trang chủ"
        actions={
          <Button
            variant="contained"
            className="a-action"
            aria-label="Thêm voucher"
            startIcon={<IconPlus width={18} />}
            onClick={() => setEditing(null)}
          >
            <span>Thêm voucher</span>
          </Button>
        }
      />
      <div className="a-panel">
        <div className={styles.toolbar}>
          <TextField
            size="small"
            placeholder="Mã, mô tả..."
            value={filters.keyword}
            onChange={(event) => updateFilter('keyword', event.target.value)}
            className={styles.search}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <IconSearch width={18} />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            select
            size="small"
            label="Hiển thị"
            value={filters.visibility}
            onChange={(event) =>
              updateFilter('visibility', event.target.value as Filters['visibility'])
            }
            className={styles.select}
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="public">Công khai</MenuItem>
            <MenuItem value="private">Riêng</MenuItem>
          </TextField>
        </div>
        <div className={styles.statusRow}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filters.status}
            onChange={(_event, value: Filters['status'] | null) => {
              if (value !== null) updateFilter('status', value);
            }}
            aria-label="Lọc theo trạng thái"
            className={styles.group}
          >
            <ToggleButton value="">Tất cả</ToggleButton>
            {STATUSES.map((status) => (
              <ToggleButton key={status} value={status}>
                {VOUCHER_STATUS_TAG[status].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {hasFilters && (
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setPagination((current) => ({ ...current, page: 0 }));
              }}
            >
              Xoá bộ lọc
            </Button>
          )}
        </div>

        {vouchers.isError && (
          <Alert severity="error" className="mb-3">
            {errorMessage(vouchers.error)}
          </Alert>
        )}
        <DataGrid
          rows={vouchers.data?.items ?? []}
          columns={columns}
          columnVisibilityModel={{
            discountValue: !narrow,
            minOrderValue: !narrow,
            startAt: !narrow,
          }}
          rowCount={vouchers.data?.meta?.total ?? 0}
          loading={vouchers.isFetching}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
          rowHeight={narrow ? 72 : 64}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          autoHeight
          localeText={{ noRowsLabel: hasFilters ? 'Không có voucher phù hợp' : 'Chưa có voucher' }}
        />
      </div>

      <VoucherFormDialog
        open={editing !== undefined}
        voucher={editing ?? null}
        onClose={() => setEditing(undefined)}
      />
      {viewingOrders && (
        <VoucherOrdersDialog voucher={viewingOrders} onClose={() => setViewingOrders(null)} />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Xoá voucher"
        content={
          <>
            Xoá voucher <strong>{deleting?.code}</strong>? Thao tác này không hoàn tác được.
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
