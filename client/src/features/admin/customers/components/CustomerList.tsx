'use client';

import {
  Alert,
  Button,
  InputAdornment,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconSearch } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserAvatar } from '@/features/profile';
import { useDebounce } from '@/hooks/useDebounce';
import { errorMessage } from '@/lib/form';
import { formatDateTime, formatPrice } from '@/lib/format';
import { useCustomers } from '../hooks/useCustomers';
import type { CustomerListParams, CustomerRow, CustomerSort } from '../types';
import styles from './CustomerList.module.css';
import { CustomerStatusChip } from './CustomerStatusChip';

export const customerHref = (id: number) => `/admin/khach-hang/${id}`;

const SORTS: { value: CustomerSort; label: string }[] = [
  { value: 'newest', label: 'Mới đăng ký' },
  { value: 'spent', label: 'Chi tiêu nhiều' },
  { value: 'orders', label: 'Nhiều đơn' },
];

const STATUS_OPTIONS: { value: '' | NonNullable<CustomerListParams['status']>; label: string }[] =
  [
    { value: '', label: 'Tất cả' },
    { value: 'active', label: 'Hoạt động' },
    { value: 'locked', label: 'Đã khoá' },
  ];

const columns: GridColDef<CustomerRow>[] = [
  {
    field: 'fullName',
    headerName: 'Khách hàng',
    flex: 1,
    minWidth: 200,
    renderCell: ({ row }) => (
      <span className={styles.who}>
        <UserAvatar fullName={row.fullName} size={30} />
        <span className={styles.whoText}>
          <span className={styles.name}>{row.fullName}</span>
          <span className={styles.mail}>{row.email}</span>
        </span>
      </span>
    ),
  },
  { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
  { field: 'phone', headerName: 'SĐT', width: 120, valueGetter: (value) => value ?? '—' },
  { field: 'orderCount', headerName: 'Số đơn', width: 90, align: 'center', headerAlign: 'center' },
  {
    field: 'totalSpent',
    headerName: 'Đã chi tiêu',
    width: 140,
    align: 'right',
    headerAlign: 'right',
    renderCell: ({ row }) => <span className={styles.spent}>{formatPrice(row.totalSpent)}</span>,
  },
  {
    field: 'createdAt',
    headerName: 'Ngày đăng ký',
    width: 150,
    valueFormatter: (value: string) => formatDateTime(value),
  },
  {
    field: 'isActive',
    headerName: 'Trạng thái',
    width: 130,
    renderCell: ({ row }) => (
      <span className={styles.cell}>
        <CustomerStatusChip isActive={row.isActive} />
      </span>
    ),
  },
];

interface Filters {
  keyword: string;
  status: CustomerListParams['status'] | '';
  sort: CustomerSort;
}

const EMPTY_FILTERS: Filters = { keyword: '', status: '', sort: 'newest' };

/** Trang /admin/khach-hang (M08 mục 4.3) */
export function CustomerList() {
  const router = useRouter();
  const narrow = useMediaQuery('(max-width: 899px)');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const q = useDebounce(filters.keyword.trim());

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 0 }));
  };
  const hasFilters = filters.keyword || filters.status || filters.sort !== 'newest';

  const customers = useCustomers({
    q: q || undefined,
    status: filters.status || undefined,
    sort: filters.sort,
    page: pagination.page + 1,
    limit: pagination.pageSize,
  });

  return (
    <>
      <PageHeader
        title="Khách hàng"
        description="Tài khoản khách hàng, lịch sử mua và khoá / mở khoá tài khoản"
      />
      <div className="a-panel">
        <div className={styles.toolbar}>
          <TextField
            size="small"
            placeholder="Tên, email, SĐT..."
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
            label="Sắp xếp"
            value={filters.sort}
            onChange={(event) => updateFilter('sort', event.target.value as CustomerSort)}
            className={styles.select}
          >
            {SORTS.map(({ value, label }) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
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
            className={styles.statusGroup}
          >
            {STATUS_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
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

        {customers.isError && (
          <Alert severity="error" className="mb-3">
            {errorMessage(customers.error)}
          </Alert>
        )}
        <DataGrid
          rows={customers.data?.items ?? []}
          columns={columns}
          columnVisibilityModel={{ email: !narrow, phone: !narrow, createdAt: !narrow }}
          rowCount={customers.data?.meta?.total ?? 0}
          loading={customers.isFetching}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
          onRowClick={({ row }) => router.push(customerHref(row.id))}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          autoHeight
          localeText={{ noRowsLabel: 'Không có khách hàng phù hợp' }}
          sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
        />
      </div>
    </>
  );
}
