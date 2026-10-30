'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { formatDateTime, formatPrice } from '@/lib/format';
import { useVnpayReturn } from '../hooks/usePayment';
import { PayNowButton } from './PayNowButton';
import styles from './PaymentResult.module.css';
import { ResultCard, ResultTicket } from './ResultParts';

const ORDERS_PATH = '/tai-khoan/don-hang';
/** Thanh toán thành công → tự chuyển tới đơn hàng sau bấy nhiêu ms */
const REDIRECT_DELAY_MS = 3000;

/** Trang /thanh-toan/ket-qua — VNPay chuyển trình duyệt về đây (M07 mục 4.2). Chỉ hiển thị */
export function PaymentResult({ query }: { query: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const result = useVnpayReturn(query);
  const data = result.data;

  useEffect(() => {
    if (!data) return;
    // Trạng thái thanh toán có thể vừa đổi (IPN) → tải lại đơn hàng
    void queryClient.invalidateQueries({ queryKey: ['me', 'orders'] });
    if (!data.success) return;
    const timer = setTimeout(
      () => router.replace(`${ORDERS_PATH}/${data.orderId}`),
      REDIRECT_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [data, queryClient, router]);

  if (result.isPending && result.fetchStatus !== 'idle') {
    return (
      <ResultCard tone="wait" title="Đang xác nhận...">
        <p className={styles.msg}>
          Đang xác nhận kết quả thanh toán. Vui lòng không đóng trang này.
        </p>
      </ResultCard>
    );
  }

  if (!data) {
    return (
      <ResultCard
        tone="unknown"
        title={
          <>
            Không xác định được <em>kết quả</em>
          </>
        }
      >
        <p className={styles.msg}>
          Bạn có thể kiểm tra trạng thái thanh toán trong mục Đơn hàng của tôi.
        </p>
        <div className={styles.actions}>
          <Link href={ORDERS_PATH} className="btn btn-gold">
            <span>Đơn hàng của tôi</span>
          </Link>
        </div>
      </ResultCard>
    );
  }

  const orderHref = `${ORDERS_PATH}/${data.orderId}`;
  const ticket = (
    <ResultTicket
      rows={[
        { label: 'Mã đơn hàng', value: data.orderCode },
        { label: 'Số tiền', value: formatPrice(data.amount), strong: true },
        ...(data.transactionNo && data.transactionNo !== '0'
          ? [{ label: 'Mã giao dịch VNPay', value: data.transactionNo }]
          : []),
      ]}
    />
  );

  if (data.success) {
    return (
      <ResultCard
        tone="ok"
        title={
          <>
            Thanh toán <em>thành công</em>
          </>
        }
      >
        <p className={styles.msg}>Cảm ơn bạn! Đang chuyển tới đơn hàng của bạn...</p>
        {ticket}
        <div
          className={styles.count}
          style={{ '--dur': `${REDIRECT_DELAY_MS}ms` } as never}
          aria-hidden="true"
        />
        <div className={styles.actions}>
          <Link href={orderHref} className="btn btn-gold">
            <span>Xem đơn hàng</span>
          </Link>
        </div>
      </ResultCard>
    );
  }

  const canRetry = data.paymentDueAt !== null && new Date(data.paymentDueAt) > new Date();
  return (
    <ResultCard
      tone="fail"
      title={
        <>
          Thanh toán <em>không thành công</em>
        </>
      }
    >
      <p className={styles.msg}>{data.message}</p>
      {ticket}
      {canRetry && data.paymentDueAt && (
        <p className={styles.due}>
          Đơn hàng được giữ đến <strong>{formatDateTime(data.paymentDueAt)}</strong> — sau thời gian
          này đơn sẽ tự huỷ.
        </p>
      )}
      <div className={styles.actions}>
        <Link href={orderHref} className="btn btn-ghost">
          <span>Xem đơn hàng</span>
        </Link>
        {canRetry && <PayNowButton orderId={data.orderId}>Thử thanh toán lại</PayNowButton>}
      </div>
    </ResultCard>
  );
}
