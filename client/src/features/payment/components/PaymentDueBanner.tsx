'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@/lib/format';
import { PayNowButton } from './PayNowButton';
import styles from './PaymentDueBanner.module.css';

/** Còn dưới bấy nhiêu ms thì đồng hồ đổi sang đỏ */
const URGENT_MS = 2 * 60 * 1000;

/** Thời gian còn lại (ms) tới `dueAt`, cập nhật mỗi giây */
function useRemaining(dueAt: string) {
  const due = new Date(dueAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, due - now);
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Đơn VNPay chưa thanh toán: hạn thanh toán (đếm ngược) + nút Thanh toán ngay (M07 mục 4.3) */
export function PaymentDueBanner({
  orderId,
  dueAt,
  failed,
}: {
  orderId: number;
  dueAt: string;
  /** Lượt thử gần nhất thất bại */
  failed?: boolean;
}) {
  const remaining = useRemaining(dueAt);

  if (remaining === 0) {
    return (
      <div className={styles.banner} data-urgent="true" role="alert">
        <p>Đơn hàng đã hết hạn thanh toán và sẽ được tự động huỷ trong ít phút.</p>
      </div>
    );
  }

  return (
    <div className={styles.banner} data-urgent={remaining < URGENT_MS} role="status">
      <p>
        <strong>✦ {failed ? 'Thanh toán chưa thành công' : 'Đơn hàng chờ thanh toán'}</strong> — vui
        lòng thanh toán trước {formatDateTime(dueAt).slice(-5)}, quá hạn đơn sẽ tự huỷ.
      </p>
      <span className={styles.clock} aria-label="Thời gian còn lại">
        {formatCountdown(remaining)}
      </span>
      <PayNowButton orderId={orderId} size="small" />
    </div>
  );
}
