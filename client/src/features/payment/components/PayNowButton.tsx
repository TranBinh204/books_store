'use client';

import type { ReactNode } from 'react';
import { useSnackbar } from 'notistack';
import { errorMessage } from '@/lib/form';
import { usePayWithVnpay } from '../hooks/usePayment';

/** "Thanh toán ngay" — tạo lượt thử mới và chuyển sang VNPay (M07 quy tắc 3) */
export function PayNowButton({
  orderId,
  children = 'Thanh toán ngay',
  size,
}: {
  orderId: number;
  children?: ReactNode;
  size?: 'small';
}) {
  const { enqueueSnackbar } = useSnackbar();
  const pay = usePayWithVnpay();

  return (
    <button
      type="button"
      className={size === 'small' ? 'btn btn-gold btn-sm' : 'btn btn-gold'}
      // Thành công → đang chuyển trang: giữ trạng thái chờ
      aria-busy={pay.isPending || pay.isSuccess}
      disabled={pay.isPending || pay.isSuccess}
      onClick={() =>
        pay.mutate(orderId, {
          onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
        })
      }
    >
      <span>{children}</span>
    </button>
  );
}
