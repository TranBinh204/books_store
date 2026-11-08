'use client';

import { Skeleton, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { formatPrice } from '@/lib/format';
import type { DashboardOverview } from '../types';
import { Panel } from './Panel';

/** 1.250.000 → "1,3tr" · 85.000 → "85k" (trục tung) */
function shortMoney(value: number) {
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

/** "2026-10-01" → "01/10" · "2026-10" → "10/2026" */
function bucketLabel(date: string) {
  const [year, month, day] = date.split('-');
  return day ? `${day}/${month}` : `${month}/${year}`;
}

// Lưới & trục theo bảng màu Admin (docs/06-ui-ux/admin/01-dashboard.md 3.1)
const AXIS_LINE = 'rgba(181, 148, 106, 0.35)';
const GRID_LINE = 'rgba(181, 148, 106, 0.18)';

/** Biểu đồ cột doanh thu theo ngày / tháng (M14 quy tắc 6) */
export function RevenueChart({ data }: { data: DashboardOverview | undefined }) {
  const theme = useTheme();
  const title =
    data?.range.granularity === 'month' ? 'Doanh thu theo tháng' : 'Doanh thu theo ngày';
  const empty = data && data.chart.every((point) => point.orders === 0);

  return (
    <Panel title={title}>
      {!data ? (
        <Skeleton variant="rounded" height={300} />
      ) : empty ? (
        <p className="flex h-[300px] items-center justify-center text-[15px] text-bone-2">
          Chưa có đơn hàng trong khoảng này
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(data.chart.length * 28, 320) }}>
            <BarChart
              height={300}
              xAxis={[
                {
                  scaleType: 'band',
                  data: data.chart.map((point) => bucketLabel(point.date)),
                },
              ]}
              yAxis={[{ valueFormatter: (value: number) => shortMoney(value), width: 48 }]}
              series={[
                {
                  data: data.chart.map((point) => point.revenue),
                  label: 'Doanh thu',
                  color: theme.palette.primary.main,
                  valueFormatter: (value, { dataIndex }) =>
                    `${formatPrice(value ?? 0)} · ${data.chart[dataIndex].orders} đơn`,
                },
              ]}
              borderRadius={2}
              grid={{ horizontal: true }}
              hideLegend
              margin={{ left: 8, right: 8, top: 16, bottom: 8 }}
              sx={{
                '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: AXIS_LINE },
                '& .MuiChartsAxis-tickLabel': { fill: theme.palette.text.secondary, fontSize: 13 },
                '& .MuiChartsGrid-line': { stroke: GRID_LINE },
                '& .MuiBarElement-root:hover': { fill: theme.palette.primary.light },
              }}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}
