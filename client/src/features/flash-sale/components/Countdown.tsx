'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import styles from './Countdown.module.css';

const SECOND = 1000;

/** Đồng hồ dùng chung, nhảy mỗi giây */
function subscribe(onTick: () => void) {
  const timer = window.setInterval(onTick, SECOND);
  return () => window.clearInterval(timer);
}
const getNow = () => Math.floor(Date.now() / SECOND) * SECOND;
/** Lúc render trên server chưa có giờ trình duyệt → hiện "--" (tránh lệch hydration) */
const getServerNow = () => null;

const pad = (value: number) => String(value).padStart(2, '0');

interface CountdownProps {
  endAt: string;
  /**
   * `curse`: 3 ô bát giác giờ / phút / giây, số đổi thì lóe sáng (khối "Lời nguyền nửa đêm" — demo 07) ·
   * `inline`: chữ liền (dải trên trang chi tiết)
   */
  variant?: 'curse' | 'inline';
}

/**
 * Đếm ngược tới `endAt` — "02 : 15 : 08", > 24 giờ thêm "N ngày" (M12 mục 4.1).
 * Về 0 → làm mới trang để giá trở về giá thường.
 */
export function Countdown({ endAt, variant = 'curse' }: CountdownProps) {
  const router = useRouter();
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const remaining = now === null ? null : Math.max(0, new Date(endAt).getTime() - now);
  const ended = remaining === 0;

  useEffect(() => {
    if (ended) router.refresh();
  }, [ended, router]);

  const total = Math.floor((remaining ?? 0) / SECOND);
  const days = Math.floor(total / 86400);
  const parts =
    remaining === null
      ? ['--', '--', '--']
      : [
          pad(Math.floor((total % 86400) / 3600)),
          pad(Math.floor((total % 3600) / 60)),
          pad(total % 60),
        ];

  if (variant === 'curse') {
    // Giờ tính tổng (có thể > 24) — demo chỉ có 3 ô
    const cells = [
      { value: remaining === null ? '--' : pad(Math.floor(total / 3600)), label: 'giờ' },
      { value: parts[1], label: 'phút' },
      { value: parts[2], label: 'giây' },
    ];
    return (
      <div className={styles.cd} role="timer" aria-label="Thời gian còn lại">
        {cells.map((cell) => (
          <div key={cell.label} className={styles.unit}>
            {/* key theo giá trị → số đổi thì tạo lại phần tử, chạy hiệu ứng lóe sáng */}
            <b key={cell.value}>{cell.value}</b>
            <small>{cell.label}</small>
          </div>
        ))}
      </div>
    );
  }

  return (
    <span className="font-bold tabular-nums">
      {days > 0 && `${days} ngày `}
      {parts.join(':')}
    </span>
  );
}
