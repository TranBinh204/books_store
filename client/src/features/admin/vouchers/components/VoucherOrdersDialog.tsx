'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import Link from 'next/link';
import { useState } from 'react';
import { OrderStatusChip } from '@/features/order';
import { formatDateTime, formatPrice } from '@/lib/format';
import { useVoucherOrders } from '../hooks/useAdminVouchers';
import type { AdminVoucher, VoucherOrderUsage } from '../types';

/** Hộp thoại "Lượt dùng": các đơn đã dùng mã (gồm đơn đã huỷ — đã trả lượt) */
export function VoucherOrdersDialog({
  voucher,
  onClose,
}: {
  voucher: AdminVoucher;
  onClose: () => void;
}) {
  const narrow = useMediaQuery('(max-width: 639px)');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const orders = useVoucherOrders(voucher.id, pagination.page + 1, pagination.pageSize);

  const columns: GridColDef<VoucherOrderUsage>[] = [
    {
      field: 'orderCode',
      headerName: 'Mã đơn',
      width: 150,
      renderCell: ({ row }) => (
        <Link href={`/admin/don-hang/${row.orderId}`} className="font-semibold text-gold-hi hover:underline">
          {row.orderCode}
        </Link>
      ),
    },
    {
      field: 'customer',
      headerName: 'Khách hàng',
      flex: 1,
      minWidth: 160,
      renderCell: ({ row }) => (
        <Link href={`/admin/khach-hang/${row.customer.id}`} className="text-bone hover:text-gold-hi">
          {row.customer.fullName}
        </Link>
      ),
    },
    {
      field: 'discountAmount',
      headerName: 'Giảm',
      width: 110,
      valueFormatter: (value: number) => `−${formatPrice(value)}`,
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 200,
      renderCell: ({ row }) => (
        <span className="flex h-full items-center gap-1.5">
          <OrderStatusChip status={row.status} />
          {row.status === 'CANCELLED' && (
            <span className="text-[13px] text-bone-2">đã trả lượt</span>
          )}
        </span>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Ngày đặt',
      width: 140,
      valueFormatter: (value: string) => formatDateTime(value),
    },
  ];

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth fullScreen={narrow}>
      <DialogTitle>
        Lượt dùng mã {voucher.code}
        <span className="ml-2 text-[15px] font-normal text-bone-2">
          Đang giữ {voucher.usedCount}
          {voucher.usageLimit !== null && ` / ${voucher.usageLimit}`} lượt
        </span>
      </DialogTitle>
      <DialogContent>
        <DataGrid
          rows={orders.data?.items ?? []}
          getRowId={(row) => row.orderId}
          columns={columns}
          columnVisibilityModel={{ createdAt: !narrow, discountAmount: !narrow }}
          rowCount={orders.data?.meta?.total ?? 0}
          loading={orders.isFetching}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20]}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          autoHeight
          localeText={{ noRowsLabel: 'Chưa có đơn nào dùng mã này' }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
