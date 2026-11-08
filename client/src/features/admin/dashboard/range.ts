import dayjs from 'dayjs';
import type { DayRange } from './types';

// Khoảng thời gian của Dashboard (M14 quy tắc 4) — lưu trên URL ?range= hoặc ?from=&to=

export const RANGE_PRESETS = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'this-month', label: 'Tháng này' },
  { value: 'last-month', label: 'Tháng trước' },
  { value: 'this-year', label: 'Năm nay' },
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number]['value'];

export const DEFAULT_PRESET: RangePreset = '7d';
/** Khoảng tuỳ chọn tối đa (khớp server) */
export const MAX_RANGE_DAYS = 366;

const FORMAT = 'YYYY-MM-DD';

export function presetRange(preset: RangePreset, now = dayjs()): DayRange {
  const today = now.startOf('day');
  const range = (from: dayjs.Dayjs, to: dayjs.Dayjs) => ({
    from: from.format(FORMAT),
    to: to.format(FORMAT),
  });
  switch (preset) {
    case 'today':
      return range(today, today);
    case '7d':
      return range(today.subtract(6, 'day'), today);
    case '30d':
      return range(today.subtract(29, 'day'), today);
    case 'this-month':
      return range(today.startOf('month'), today);
    case 'last-month': {
      const last = today.subtract(1, 'month');
      return range(last.startOf('month'), last.endOf('month'));
    }
    case 'this-year':
      return range(today.startOf('year'), today);
  }
}

const isDay = (value: string | null): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayjs(value).isValid();

/** Đọc khoảng từ URL — sai / thiếu → 7 ngày qua */
export function readRange(params: URLSearchParams): {
  preset: RangePreset | 'custom';
  range: DayRange;
} {
  const from = params.get('from');
  const to = params.get('to');
  if (isDay(from) && isDay(to)) {
    const days = dayjs(to).diff(dayjs(from), 'day') + 1;
    if (days >= 1 && days <= MAX_RANGE_DAYS) return { preset: 'custom', range: { from, to } };
  }
  const preset = RANGE_PRESETS.find((item) => item.value === params.get('range'))?.value;
  return { preset: preset ?? DEFAULT_PRESET, range: presetRange(preset ?? DEFAULT_PRESET) };
}

/** "2026-10-01" → "01/10/2026" */
export const formatDay = (day: string) => dayjs(day).format('DD/MM/YYYY');
