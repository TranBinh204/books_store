'use client';

import { Alert, Button, Menu, MenuItem, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { IconDownload, IconRefresh } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { useCurrentUser } from '@/features/auth';
import { errorMessage } from '@/lib/form';
import { downloadReport } from '../api/dashboard.api';
import { dashboardKey, useDashboardOverview, useDashboardTasks } from '../hooks/useDashboard';
import { MAX_RANGE_DAYS, RANGE_PRESETS, formatDay, readRange, type RangePreset } from '../range';
import type { DayRange, ReportType } from '../types';
import { LowStockTable, TopBooksTable } from './BookTables';
import { MetricCards } from './MetricCards';
import { RevenueChart } from './RevenueChart';
import { TaskPanel } from './TaskPanel';

const REPORTS: { type: ReportType; label: string }[] = [
  { type: 'revenue', label: 'Doanh thu theo ngày' },
  { type: 'orders', label: 'Danh sách đơn hàng' },
  { type: 'top-books', label: 'Sách bán chạy' },
];

/** Xuất báo cáo CSV theo khoảng đang chọn (M14 quy tắc 10) */
function ExportMenu({ range }: { range: DayRange }) {
  const { enqueueSnackbar } = useSnackbar();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);

  const download = async (type: ReportType) => {
    setAnchor(null);
    setBusy(true);
    try {
      await downloadReport(type, range);
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<IconDownload width={20} />}
        onClick={(event) => setAnchor(event.currentTarget)}
        loading={busy}
        aria-label="Xuất báo cáo"
        className="a-action"
      >
        <span>Xuất báo cáo</span>
      </Button>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
        {REPORTS.map(({ type, label }) => (
          <MenuItem key={type} onClick={() => download(type)}>
            {label} (CSV)
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

/** Trang /admin — Dashboard (M14 mục 4) */
export function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const { preset, range } = readRange(searchParams);
  const [customOpen, setCustomOpen] = useState(preset === 'custom');

  const overview = useDashboardOverview(range);
  const tasks = useDashboardTasks();

  const setPreset = (value: RangePreset) => {
    setCustomOpen(false);
    router.replace(`${pathname}?range=${value}`, { scroll: false });
  };
  const setCustom = (next: DayRange) =>
    router.replace(`${pathname}?from=${next.from}&to=${next.to}`, { scroll: false });

  const changeCustom = (key: 'from' | 'to', value: dayjs.Dayjs | null) => {
    if (!value?.isValid()) return;
    const next = { ...range, [key]: value.format('YYYY-MM-DD') };
    // Giữ khoảng hợp lệ: từ ≤ đến, tối đa 366 ngày
    if (key === 'from' && next.from > next.to) next.to = next.from;
    if (key === 'to' && next.to < next.from) next.from = next.to;
    if (dayjs(next.to).diff(dayjs(next.from), 'day') + 1 > MAX_RANGE_DAYS) {
      if (key === 'from')
        next.to = dayjs(next.from)
          .add(MAX_RANGE_DAYS - 1, 'day')
          .format('YYYY-MM-DD');
      else
        next.from = dayjs(next.to)
          .subtract(MAX_RANGE_DAYS - 1, 'day')
          .format('YYYY-MM-DD');
    }
    setCustom(next);
  };

  const data = overview.data;

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user?.fullName ?? ''}`}
        description={
          data
            ? `Tình hình kinh doanh ${formatDay(range.from)} – ${formatDay(range.to)} · so với ${formatDay(
                data.previousRange.from,
              )} – ${formatDay(data.previousRange.to)}`
            : 'Tình hình kinh doanh của cửa hàng'
        }
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<IconRefresh width={20} />}
              onClick={() => queryClient.invalidateQueries({ queryKey: dashboardKey })}
              loading={overview.isFetching || tasks.isFetching}
              aria-label="Làm mới"
              className="a-action"
            >
              <span>Làm mới</span>
            </Button>
            <ExportMenu range={range} />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ToggleButtonGroup
          size="small"
          exclusive
          value={customOpen || preset === 'custom' ? 'custom' : preset}
          onChange={(_event, value: RangePreset | 'custom' | null) => {
            if (value === 'custom') setCustomOpen(true);
            else if (value) setPreset(value);
          }}
          className="flex-wrap"
        >
          {RANGE_PRESETS.map(({ value, label }) => (
            <ToggleButton key={value} value={value}>
              {label}
            </ToggleButton>
          ))}
          <ToggleButton value="custom">Tuỳ chọn</ToggleButton>
        </ToggleButtonGroup>
        {(customOpen || preset === 'custom') && (
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              label="Từ ngày"
              value={dayjs(range.from)}
              onChange={(value) => changeCustom('from', value)}
              format="DD/MM/YYYY"
              disableFuture
              slotProps={{ textField: { size: 'small', className: 'w-40' } }}
            />
            <DatePicker
              label="Đến ngày"
              value={dayjs(range.to)}
              onChange={(value) => changeCustom('to', value)}
              format="DD/MM/YYYY"
              disableFuture
              slotProps={{ textField: { size: 'small', className: 'w-40' } }}
            />
          </div>
        )}
      </div>

      {(overview.isError || tasks.isError) && (
        <Alert severity="error" className="mb-4">
          {errorMessage(overview.error ?? tasks.error)}
        </Alert>
      )}

      <div className="flex flex-col gap-4">
        <MetricCards data={data} />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <RevenueChart data={data} />
          </div>
          <TaskPanel data={tasks.data} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TopBooksTable data={data} />
          <LowStockTable data={tasks.data} />
        </div>
      </div>
    </>
  );
}
