'use client';

import { Alert, Button, Collapse, InputAdornment, MenuItem, TextField } from '@mui/material';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { IconFilter, IconSearch } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '@/features/order';
import { useDebounce } from '@/hooks/useDebounce';
import { errorMessage } from '@/lib/form';
import { useAdminOrderCounts, useAdminOrders } from '../hooks/useAdminOrders';
import { PAYMENT_METHOD_SHORT, PAYMENT_STATUS_TAG } from '../labels';
import type { AdminOrderSort } from '../types';
import styles from './AdminOrderList.module.css';
import { AdminOrderTable } from './AdminOrderTable';

const PAGE_SIZE = 20;
const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
/** Tab đặc biệt: đơn đã huỷ nhưng đã nhận tiền */
const REFUND_TAB = 'CAN_HOAN_TIEN';

const SORTS: { value: AdminOrderSort; label: string }[] = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'created_asc', label: 'Cũ nhất' },
  { value: 'total_desc', label: 'Tổng tiền cao' },
];

/** Bộ lọc lưu trên URL (?tab=&q=&method=...) — quay lại từ chi tiết đơn vẫn giữ nguyên */
interface Filters {
  tab: string;
  q: string;
  method: string;
  payment: string;
  from: string;
  to: string;
  sort: string;
  page: number;
}

function readFilters(params: URLSearchParams): Filters {
  return {
    tab: params.get('tab') ?? '',
    q: params.get('q') ?? '',
    method: params.get('method') ?? '',
    payment: params.get('payment') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    sort: params.get('sort') ?? '',
    page: Math.max(1, Number(params.get('page')) || 1),
  };
}

function toQuery(filters: Filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'page' ? value > 1 : value) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Trang /admin/don-hang (M08 mục 4.1) */
export function AdminOrderList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = readFilters(searchParams);
  const [keyword, setKeyword] = useState(filters.q);
  const [moreOpen, setMoreOpen] = useState(false);
  const debouncedKeyword = useDebounce(keyword.trim());

  /** Đổi bộ lọc → về trang 1 (trừ khi đổi chính số trang) */
  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, page: 1, ...patch };
    router.replace(`${pathname}${toQuery(next)}`, { scroll: false });
  };

  // Ô tìm kiếm: ngừng gõ mới ghi lên URL
  useEffect(() => {
    const current = readFilters(searchParams);
    if (debouncedKeyword === current.q) return;
    router.replace(`${pathname}${toQuery({ ...current, q: debouncedKeyword, page: 1 })}`, {
      scroll: false,
    });
  }, [debouncedKeyword, searchParams, pathname, router]);

  const isRefundTab = filters.tab === REFUND_TAB;
  const orders = useAdminOrders({
    status: STATUSES.includes(filters.tab as OrderStatus)
      ? (filters.tab as OrderStatus)
      : undefined,
    needsRefund: isRefundTab || undefined,
    paymentMethod: (filters.method || undefined) as PaymentMethod | undefined,
    paymentStatus: (filters.payment || undefined) as PaymentStatus | undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    q: filters.q || undefined,
    sort: (filters.sort || 'created_desc') as AdminOrderSort,
    page: filters.page,
    limit: PAGE_SIZE,
  });
  const counts = useAdminOrderCounts().data;
  const total = STATUSES.reduce((sum, status) => sum + (counts?.[status] ?? 0), 0);

  const tabs = [
    { value: '', label: 'Tất cả', count: total },
    ...STATUSES.map((status) => ({
      value: status,
      label: ORDER_STATUS_LABELS[status].label,
      count: counts?.[status] ?? 0,
    })),
    { value: REFUND_TAB, label: 'Cần hoàn tiền', count: counts?.needsRefund ?? 0 },
  ];
  const hasFilters = Boolean(
    filters.q || filters.method || filters.payment || filters.from || filters.to || filters.sort,
  );
  const advancedCount = [filters.from, filters.to].filter(Boolean).length;

  return (
    <>
      <PageHeader title="Đơn hàng" description="Xử lý đơn hàng, theo dõi thanh toán và hoàn tiền" />
      <div className="a-panel">
        <div className={styles.tabs} role="tablist">
          {tabs.map((tab) => {
            const active = tab.value === filters.tab;
            const alert = tab.value === REFUND_TAB && tab.count > 0;
            return (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => update({ tab: tab.value })}
                className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`${styles.pill} ${alert ? styles.pillAlert : ''}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className={styles.toolbar}>
          <div className={styles.row}>
            <TextField
              size="small"
              placeholder="Mã đơn, SĐT, tên, email..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
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
              label="Phương thức"
              value={filters.method}
              onChange={(event) => update({ method: event.target.value })}
              className={styles.select}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {Object.entries(PAYMENT_METHOD_SHORT).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Thanh toán"
              value={filters.payment}
              onChange={(event) => update({ payment: event.target.value })}
              className={styles.select}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {Object.entries(PAYMENT_STATUS_TAG).map(([value, { label }]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Sắp xếp"
              value={filters.sort || 'created_desc'}
              onChange={(event) =>
                update({ sort: event.target.value === 'created_desc' ? '' : event.target.value })
              }
              className={styles.select}
            >
              {SORTS.map(({ value, label }) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              size="small"
              color="inherit"
              startIcon={<IconFilter width={18} />}
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              className={styles.moreBtn}
            >
              Lọc thêm{advancedCount > 0 ? ` (${advancedCount})` : ''}
            </Button>
            {hasFilters && (
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setKeyword('');
                  router.replace(
                    `${pathname}${toQuery({ ...readFilters(new URLSearchParams()), tab: filters.tab })}`,
                    { scroll: false },
                  );
                }}
              >
                Xoá bộ lọc
              </Button>
            )}
          </div>
          <Collapse in={moreOpen || advancedCount > 0} unmountOnExit>
            <div className={styles.advanced}>
              <TextField
                size="small"
                type="date"
                label="Từ ngày"
                value={filters.from}
                onChange={(event) => update({ from: event.target.value })}
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
                onChange={(event) => update({ to: event.target.value })}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: filters.from || undefined },
                }}
              />
            </div>
          </Collapse>
        </div>

        {orders.isError && (
          <Alert severity="error" className="mb-3">
            {errorMessage(orders.error)}
          </Alert>
        )}
        <AdminOrderTable
          rows={orders.data?.items ?? []}
          total={orders.data?.meta?.total ?? 0}
          loading={orders.isFetching}
          pagination={{ page: filters.page - 1, pageSize: PAGE_SIZE }}
          onPaginationChange={(model) => update({ page: model.page + 1 })}
        />
      </div>
    </>
  );
}
