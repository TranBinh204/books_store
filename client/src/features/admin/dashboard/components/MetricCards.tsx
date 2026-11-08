import { Skeleton } from '@mui/material';
import type { ReactNode } from 'react';
import { formatPrice } from '@/lib/format';
import type { DashboardOverview } from '../types';
import styles from './Dashboard.module.css';
import { Sparkline } from './Sparkline';

/** ▲ 12% (xanh) / ▼ 5% (đỏ) so với kỳ trước — kỳ trước = 0 → "—" (quy tắc 5) */
function Change({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span>—</span>;
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return <span>0%</span>;
  return (
    <span className={percent > 0 ? styles.up : styles.down}>
      {percent > 0 ? '▲' : '▼'} {Math.abs(percent)}%
    </span>
  );
}

function MetricCard({
  label,
  value,
  current,
  previous,
  trend,
  note,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  /** Giá trị theo từng ngày / tháng trong khoảng, vẽ đường xu hướng */
  trend: number[];
  note?: ReactNode;
}) {
  return (
    <div className={`a-panel ${styles.metric}`}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricChange}>
        <Change current={current} previous={previous} />
        <span>so với kỳ trước</span>
      </span>
      {note && <span className={styles.metricNote}>{note}</span>}
      <Sparkline values={trend} className={styles.spark} />
    </div>
  );
}

/** 4 thẻ chỉ số: Doanh thu · Số đơn · Giá trị đơn TB · Khách mới (M14 mục 4) */
export function MetricCards({ data }: { data: DashboardOverview | undefined }) {
  if (!data) {
    return (
      <div className={styles.metrics}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={118} />
        ))}
      </div>
    );
  }
  const { metrics, previous, chart } = data;
  return (
    <div className={styles.metrics}>
      <MetricCard
        label="Doanh thu"
        value={formatPrice(metrics.revenue)}
        current={metrics.revenue}
        previous={previous.revenue}
        trend={chart.map((point) => point.revenue)}
        note={
          metrics.voucherDiscount > 0 && `Giảm giá voucher: ${formatPrice(metrics.voucherDiscount)}`
        }
      />
      <MetricCard
        label="Số đơn"
        value={String(metrics.orders)}
        current={metrics.orders}
        previous={previous.orders}
        trend={chart.map((point) => point.orders)}
        note={metrics.cancelledOrders > 0 && `${metrics.cancelledOrders} đơn huỷ`}
      />
      <MetricCard
        label="Giá trị đơn trung bình"
        value={formatPrice(metrics.avgOrderValue)}
        current={metrics.avgOrderValue}
        previous={previous.avgOrderValue}
        trend={chart.map((point) => (point.orders > 0 ? point.revenue / point.orders : 0))}
      />
      <MetricCard
        label="Khách mới"
        value={String(metrics.newCustomers)}
        current={metrics.newCustomers}
        previous={previous.newCustomers}
        trend={chart.map((point) => point.newCustomers)}
      />
    </div>
  );
}
