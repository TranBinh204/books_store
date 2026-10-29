'use client';

import { Alert, Button, InputAdornment, MenuItem, TextField, useMediaQuery } from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import Link from 'next/link';
import { useState } from 'react';
import { AdminTag, type AdminTagTone } from '@/components/ui/AdminTag';
import { IconSearch } from '@/components/ui/icons';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDateTime } from '@/lib/format';
import { errorMessage } from '@/lib/form';
import {
  INVENTORY_REASON_LABEL,
  type InventoryLog,
  type InventoryReason,
} from '../../catalog-types';
import { useInventoryLogs } from '../hooks/useBooks';
import styles from './InventoryLogTable.module.css';

const REASON_TONE: Record<InventoryReason, AdminTagTone> = {
  IMPORT: 'ok',
  ADJUST: 'gold',
  ORDER: 'muted',
  CANCEL: 'warn',
};

interface InventoryLogTableProps {
  /** Chỉ hiện lịch sử của 1 sách (ẩn cột tên sách & bộ lọc) */
  bookId?: number;
  pageSize?: number;
}

interface Filters {
  keyword: string;
  reason: InventoryReason | '';
  from: string;
  to: string;
}

const EMPTY_FILTERS: Filters = { keyword: '', reason: '', from: '', to: '' };

/** Bảng lịch sử tồn kho — dùng ở trang "Lịch sử tồn kho" và trang sửa sách */
export function InventoryLogTable({ bookId, pageSize = 20 }: InventoryLogTableProps) {
  const narrow = useMediaQuery('(max-width: 899px)');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const q = useDebounce(filters.keyword.trim());

  /** Đổi bộ lọc nào cũng quay về trang 1 */
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 0 }));
  };
  const hasFilters = Object.values(filters).some(Boolean);

  const logs = useInventoryLogs({
    q: q || undefined,
    bookId,
    reason: filters.reason || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    page: pagination.page + 1,
    limit: pagination.pageSize,
  });

  const columns: GridColDef<InventoryLog>[] = [
    {
      field: 'createdAt',
      headerName: 'Thời gian',
      width: 150,
      valueFormatter: (value: string) => formatDateTime(value),
    },
    ...(bookId
      ? []
      : [
          {
            field: 'book',
            headerName: 'Sách',
            flex: 1,
            minWidth: 200,
            renderCell: ({ row }) => (
              <div className={styles.bookCell}>
                <Link href={`/admin/sach/${row.book.id}`} className={styles.book}>
                  {row.book.name}
                </Link>
                {row.note && <span className={styles.note}>{row.note}</span>}
              </div>
            ),
          } satisfies GridColDef<InventoryLog>,
        ]),
    {
      field: 'reason',
      headerName: 'Loại',
      width: 140,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center">
          <AdminTag tone={REASON_TONE[row.reason]}>{INVENTORY_REASON_LABEL[row.reason]}</AdminTag>
        </div>
      ),
    },
    {
      field: 'change',
      headerName: 'Thay đổi',
      width: 100,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) => (
        <span className={`${styles.delta} ${row.change > 0 ? 'a-up' : 'a-down'}`}>
          {row.change > 0 ? `+${row.change}` : `−${Math.abs(row.change)}`}
        </span>
      ),
    },
    { field: 'stockAfter', headerName: 'Tồn sau', width: 90, align: 'right', headerAlign: 'right' },
    { field: 'note', headerName: 'Ghi chú', flex: 1, minWidth: 180 },
    {
      field: 'createdBy',
      headerName: 'Người thực hiện',
      width: 160,
      valueGetter: (_value, row) => row.createdBy?.name ?? 'Hệ thống',
    },
  ];

  return (
    <div className="a-panel">
      {!bookId && (
        <div className={styles.filters}>
          <TextField
            size="small"
            placeholder="Tìm theo tên sách..."
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
            label="Loại"
            value={filters.reason}
            onChange={(event) => updateFilter('reason', event.target.value as InventoryReason | '')}
            className={styles.reason}
          >
            <MenuItem value="">Tất cả</MenuItem>
            {Object.entries(INVENTORY_REASON_LABEL).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="date"
            label="Từ ngày"
            value={filters.from}
            onChange={(event) => updateFilter('from', event.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { max: filters.to || undefined },
            }}
          />
          <TextField
            size="small"
            type="date"
            label="Đến ngày"
            value={filters.to}
            onChange={(event) => updateFilter('to', event.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: filters.from || undefined },
            }}
          />
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
      )}
      {logs.isError && (
        <Alert severity="error" className="mb-3">
          {errorMessage(logs.error)}
        </Alert>
      )}
      <DataGrid
        rows={logs.data?.data ?? []}
        columns={columns}
        columnVisibilityModel={{ createdBy: !narrow, note: !narrow || Boolean(bookId) }}
        localeText={{
          noRowsLabel: hasFilters
            ? 'Không có biến động khớp bộ lọc'
            : 'Chưa có biến động tồn kho nào',
        }}
        rowCount={logs.data?.meta?.total ?? 0}
        loading={logs.isFetching}
        paginationMode="server"
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        pageSizeOptions={[10, 20, 50]}
        disableRowSelectionOnClick
        disableColumnMenu
        disableColumnSorting
        autoHeight
      />
    </div>
  );
}
