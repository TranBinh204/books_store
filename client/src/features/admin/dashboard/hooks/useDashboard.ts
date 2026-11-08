'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as dashboardApi from '../api/dashboard.api';
import type { DayRange } from '../types';

export const dashboardKey = ['admin', 'dashboard'] as const;

/** Chỉ số, biểu đồ, top sách theo khoảng — tải khi mở / đổi khoảng (quy tắc 11) */
export function useDashboardOverview(range: DayRange) {
  return useQuery({
    queryKey: [...dashboardKey, 'overview', range.from, range.to],
    queryFn: () => dashboardApi.getOverview(range),
    placeholderData: keepPreviousData,
  });
}

export function useDashboardTasks() {
  return useQuery({ queryKey: [...dashboardKey, 'tasks'], queryFn: dashboardApi.getTasks });
}
