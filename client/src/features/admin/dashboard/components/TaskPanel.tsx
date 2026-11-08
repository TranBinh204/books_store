import { Skeleton } from '@mui/material';
import Link from 'next/link';
import { IconChevronRight } from '@/components/ui/icons';
import { formatPrice, formatRelativeTime } from '@/lib/format';
import type { DashboardTasks } from '../types';
import styles from './Dashboard.module.css';
import { Panel } from './Panel';

const ROWS: { key: keyof DashboardTasks['orders']; label: string; tab: string; alert?: boolean }[] =
  [
    { key: 'toConfirm', label: 'Chờ xác nhận', tab: 'PENDING', alert: true },
    { key: 'toShip', label: 'Chờ giao', tab: 'CONFIRMED' },
    { key: 'shipping', label: 'Đang giao', tab: 'SHIPPING' },
    { key: 'needsRefund', label: 'Cần hoàn tiền', tab: 'CAN_HOAN_TIEN', alert: true },
  ];

/** Việc cần làm: số đơn theo nhóm (bấm → danh sách đơn đã lọc) + đơn chờ xác nhận lâu nhất */
export function TaskPanel({ data }: { data: DashboardTasks | undefined }) {
  return (
    <Panel title="Việc cần làm">
      {!data ? (
        <Skeleton variant="rounded" height={300} />
      ) : (
        <>
          <ul className={styles.taskList}>
            {ROWS.map(({ key, label, tab, alert }) => {
              const count = data.orders[key];
              return (
                <li key={key}>
                  <Link href={`/admin/don-hang?tab=${tab}`} className={styles.taskRow}>
                    <span>{label}</span>
                    <span className="flex items-center gap-1">
                      <span
                        className={`${styles.count} ${count > 0 && alert ? styles.countAlert : ''}`}
                      >
                        {count}
                      </span>
                      <IconChevronRight />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <h3 className={styles.subTitle}>Chờ xác nhận lâu nhất</h3>
          {data.oldestToConfirm.length === 0 ? (
            <p className="py-2 text-[15px] text-bone-2">Không có đơn nào đang chờ</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.oldestToConfirm.map((order) => (
                <li key={order.id}>
                  <Link href={`/admin/don-hang/${order.id}`} className={styles.oldest}>
                    <span className="min-w-0">
                      <b>{order.code}</b>
                      <small>
                        {order.customerName} · đặt {formatRelativeTime(order.createdAt)}
                      </small>
                    </span>
                    <span>{formatPrice(order.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}
