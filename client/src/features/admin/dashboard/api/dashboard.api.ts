import { http } from '@/lib/http';
import type { DashboardOverview, DashboardTasks, DayRange, ReportType } from '../types';

export async function getOverview(range: DayRange) {
  return (await http.get<DashboardOverview>('/admin/dashboard/overview', { query: { ...range } }))
    .data;
}

export async function getTasks() {
  return (await http.get<DashboardTasks>('/admin/dashboard/tasks')).data;
}

/** Tải báo cáo CSV rồi lưu file `bookstore-<loại>-<từ>_<đến>.csv` (M14 quy tắc 10) */
export async function downloadReport(type: ReportType, range: DayRange) {
  const blob = await http.download(`/admin/reports/${type}.csv`, { ...range });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bookstore-${type}-${range.from}_${range.to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
