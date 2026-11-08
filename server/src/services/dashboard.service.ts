import { env } from '../config/env';
import * as dashboardRepository from '../repositories/dashboard.repository';
import type { DashboardRangeQuery } from '../schemas/dashboard.schema';
import { daysBetween } from '../schemas/dashboard.schema';
import { startOfVietnamDay } from '../utils/date';

// Dashboard (F19) — docs/03-modules/14-admin-dashboard.md mục 3

/** Khoảng mặc định: 7 ngày qua (Q7) */
const DEFAULT_RANGE_DAYS = 7;
/** ≤ 62 ngày → biểu đồ theo ngày, dài hơn → theo tháng (Q8) */
const DAILY_CHART_MAX_DAYS = 62;
const TOP_BOOK_LIMIT = 10;
const OLDEST_ORDER_LIMIT = 5;
const LOW_STOCK_LIMIT = 10;

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Hôm nay theo giờ Việt Nam → "yyyy-mm-dd" */
export function todayInVietnam(now = Date.now()) {
  return new Date(now + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}

/** "2026-10-01" + 3 → "2026-10-04" */
export function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export interface DayRange {
  from: string;
  to: string;
}

/** Khoảng ngày (giờ VN, gồm 2 đầu) → mốc truy vấn [00:00 ngày đầu, 00:00 ngày sau ngày cuối) */
export const toTimeRange = (range: DayRange): dashboardRepository.TimeRange => ({
  from: startOfVietnamDay(range.from),
  to: startOfVietnamDay(range.to, 1),
});

/** Thiếu from / to → 7 ngày qua (tính tới hôm nay) */
export function resolveRange(query: DashboardRangeQuery): DayRange {
  if (query.from && query.to) return { from: query.from, to: query.to };
  const to = todayInVietnam();
  return { from: addDays(to, -(DEFAULT_RANGE_DAYS - 1)), to };
}

/** Kỳ trước = khoảng cùng độ dài ngay trước đó (quy tắc 5) */
export function previousRange(range: DayRange): DayRange {
  const days = daysBetween(range.from, range.to);
  return { from: addDays(range.from, -days), to: addDays(range.from, -1) };
}

const avgOf = (revenue: number, orders: number) => (orders > 0 ? Math.round(revenue / orders) : 0);

export async function getOverview(query: DashboardRangeQuery) {
  const range = resolveRange(query);
  const previous = previousRange(range);
  const granularity =
    daysBetween(range.from, range.to) <= DAILY_CHART_MAX_DAYS
      ? ('day' as const)
      : ('month' as const);
  const time = toTimeRange(range);

  const [current, before, chart, topBooks] = await Promise.all([
    dashboardRepository.metrics(time),
    dashboardRepository.metrics(toTimeRange(previous)),
    dashboardRepository.chart(range.from, range.to, time, granularity),
    dashboardRepository.topBooks(time, TOP_BOOK_LIMIT),
  ]);

  return {
    range: { ...range, granularity },
    previousRange: previous,
    metrics: { ...current, avgOrderValue: avgOf(current.revenue, current.orders) },
    previous: {
      revenue: before.revenue,
      orders: before.orders,
      avgOrderValue: avgOf(before.revenue, before.orders),
      newCustomers: before.newCustomers,
    },
    chart: chart.map(({ date, revenue, orders, newCustomers }) => ({
      date,
      revenue,
      orders,
      newCustomers,
    })),
    topBooks,
  };
}

/** Việc cần làm & sách sắp hết hàng — không phụ thuộc khoảng thời gian (quy tắc 8, 9) */
export async function getTasks() {
  const [orders, oldestToConfirm, lowStock] = await Promise.all([
    dashboardRepository.orderTasks(),
    dashboardRepository.oldestToConfirm(OLDEST_ORDER_LIMIT),
    dashboardRepository.lowStock(env.LOW_STOCK_THRESHOLD, LOW_STOCK_LIMIT),
  ]);
  return { orders, oldestToConfirm, lowStock };
}
