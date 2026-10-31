'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  TextField,
} from '@mui/material';
import type { GridPaginationModel } from '@mui/x-data-grid';
import { useSnackbar } from 'notistack';
import { useState, type ReactNode } from 'react';
import { AdminTag } from '@/components/ui/AdminTag';
import { PageHeader } from '@/components/ui/PageHeader';
import { AdminOrderTable, useAdminOrders } from '@/features/admin/orders';
import { ORDER_STATUS_LABELS, OrderStatusChip, type OrderStatus } from '@/features/order';
import { formatAddress, UserAvatar } from '@/features/profile';
import { errorMessage } from '@/lib/form';
import { formatDateTime, formatPrice } from '@/lib/format';
import { useCustomer, useSetCustomerLock } from '../hooks/useCustomers';
import type { CustomerDetail as Customer } from '../types';
import styles from './CustomerDetail.module.css';
import { CustomerStatusChip } from './CustomerStatusChip';

const CUSTOMERS_PATH = '/admin/khach-hang';
const GENDER_LABELS = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' } as const;
const ORDERS_PAGE_SIZE = 10;

function Card({
  title,
  className,
  children,
}: {
  title: string;
  /** Vị trí khi xếp 1 cột (`order` trong module CSS) */
  className: string;
  children: ReactNode;
}) {
  return (
    <section className={`a-panel ${styles.card} ${className}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** "1990-05-20" → "20/05/1990" */
const formatDate = (value: string) => value.split('-').reverse().join('/');

/** Khoá (lý do bắt buộc — Q7) / mở khoá tài khoản */
function LockDialog({
  customer,
  open,
  onClose,
}: {
  customer: Customer;
  open: boolean;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const setLock = useSetCustomerLock(customer.id);
  const [reason, setReason] = useState('');
  const locking = customer.isActive;

  const submit = () =>
    setLock.mutate(locking ? reason.trim() : null, {
      onSuccess: () => {
        enqueueSnackbar(locking ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản', {
          variant: 'success',
        });
        onClose();
      },
    });

  return (
    <Dialog open={open} onClose={setLock.isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{locking ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}</DialogTitle>
      <DialogContent className="flex flex-col gap-3">
        {setLock.isError && <Alert severity="error">{errorMessage(setLock.error)}</Alert>}
        {locking ? (
          <>
            <p className="text-sm">
              <strong>{customer.fullName}</strong> sẽ bị đăng xuất khỏi mọi thiết bị và không đăng
              nhập được. Đơn hàng đang xử lý không bị ảnh hưởng.
            </p>
            <TextField
              label="Lý do khoá (chỉ Admin thấy)"
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 255))}
              required
              autoFocus
              fullWidth
            />
          </>
        ) : (
          <p className="text-sm">
            <strong>{customer.fullName}</strong> sẽ đăng nhập và mua hàng lại được bình thường.
          </p>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={setLock.isPending} color="inherit">
          Đóng
        </Button>
        <Button
          onClick={submit}
          loading={setLock.isPending}
          disabled={locking && reason.trim().length < 2}
          variant="contained"
          color={locking ? 'error' : 'primary'}
        >
          {locking ? 'Khoá tài khoản' : 'Mở khoá'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Đơn hàng của khách — dùng lại bảng đơn Admin, lọc theo khách */
function CustomerOrders({ userId }: { userId: number }) {
  const [pagination, setPagination] = useState<GridPaginationModel>({
    page: 0,
    pageSize: ORDERS_PAGE_SIZE,
  });
  const orders = useAdminOrders({
    userId,
    sort: 'created_desc',
    page: pagination.page + 1,
    limit: pagination.pageSize,
  });
  return (
    <AdminOrderTable
      rows={orders.data?.items ?? []}
      total={orders.data?.meta?.total ?? 0}
      loading={orders.isFetching}
      pagination={pagination}
      onPaginationChange={setPagination}
    />
  );
}

/** Trang /admin/khach-hang/[id] (M08 mục 4.4) */
export function CustomerDetail({ id }: { id: number }) {
  const customer = useCustomer(id);
  const [lockOpen, setLockOpen] = useState(false);

  if (customer.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton variant="rounded" height={60} />
        <Skeleton variant="rounded" height={240} />
      </div>
    );
  }
  if (customer.isError) {
    return (
      <>
        <PageHeader
          title="Chi tiết khách hàng"
          back={{ href: CUSTOMERS_PATH, label: 'Khách hàng' }}
        />
        <Alert severity="error">{errorMessage(customer.error)}</Alert>
      </>
    );
  }

  const data = customer.data;
  const statusCounts = (Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).filter(
    (status) => (data.orderCounts[status] ?? 0) > 0,
  );

  return (
    <>
      <PageHeader
        title={data.fullName}
        back={{ href: CUSTOMERS_PATH, label: 'Khách hàng' }}
        description={<CustomerStatusChip isActive={data.isActive} />}
        actions={
          <Button
            variant={data.isActive ? 'outlined' : 'contained'}
            color={data.isActive ? 'error' : 'primary'}
            onClick={() => setLockOpen(true)}
          >
            {data.isActive ? 'Khoá tài khoản' : 'Mở khoá'}
          </Button>
        }
      />

      {!data.isActive && (
        <Alert severity="error" className="mb-4">
          Đã khoá{data.lockedAt ? ` lúc ${formatDateTime(data.lockedAt)}` : ''}
          {data.lockReason ? ` — Lý do: ${data.lockReason}` : ''}
        </Alert>
      )}

      <div className={styles.grid}>
        <div className={styles.col}>
          <Card title="Hồ sơ" className={styles.profile}>
            <div className={styles.head}>
              <UserAvatar fullName={data.fullName} size={48} />
              <div className={styles.headText}>
                <p className={styles.fullName}>{data.fullName}</p>
                <p className={styles.email}>{data.email}</p>
              </div>
            </div>
            <dl className={styles.facts}>
              <dt>SĐT</dt>
              <dd>{data.phone ?? '—'}</dd>
              <dt>Ngày sinh</dt>
              <dd>{data.birthday ? formatDate(data.birthday) : '—'}</dd>
              <dt>Giới tính</dt>
              <dd>{data.gender ? GENDER_LABELS[data.gender] : '—'}</dd>
              <dt>Đăng ký</dt>
              <dd>{formatDateTime(data.createdAt)}</dd>
            </dl>
          </Card>

          <Card title="Thống kê" className={styles.stats}>
            <dl className={styles.numbers}>
              <div>
                <dt>Tổng đơn</dt>
                <dd>{data.orderCount}</dd>
              </div>
              <div>
                <dt>Đã chi tiêu</dt>
                <dd className={styles.spent}>{formatPrice(data.totalSpent)}</dd>
              </div>
            </dl>
            {statusCounts.length > 0 && (
              <div className={styles.tags}>
                {statusCounts.map((status) => (
                  <span key={status} className="inline-flex items-center gap-1.5">
                    <OrderStatusChip status={status} />
                    <b>{data.orderCounts[status]}</b>
                  </span>
                ))}
              </div>
            )}
            {data.lastOrderAt && (
              <p className={styles.note}>Đơn gần nhất: {formatDateTime(data.lastOrderAt)}</p>
            )}
            <p className={styles.note}>&ldquo;Đã chi tiêu&rdquo; chỉ tính các đơn Đã giao.</p>
          </Card>

          <Card title={`Sổ địa chỉ (${data.addresses.length})`} className={styles.addresses}>
            {data.addresses.length === 0 ? (
              <p className={styles.empty}>Chưa có địa chỉ.</p>
            ) : (
              <ul className={styles.addr}>
                {data.addresses.map((address) => (
                  <li key={address.id}>
                    <b>{address.recipientName}</b> · {address.phone}
                    {address.isDefault && (
                      <span className="ml-2">
                        <AdminTag tone="gold">Mặc định</AdminTag>
                      </span>
                    )}
                    <p>{formatAddress(address)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Đơn hàng" className={styles.orders}>
          <CustomerOrders userId={data.id} />
        </Card>
      </div>

      <LockDialog
        key={`${lockOpen}-${data.isActive}`}
        customer={data}
        open={lockOpen}
        onClose={() => setLockOpen(false)}
      />
    </>
  );
}
