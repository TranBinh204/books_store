import { z } from 'zod';

// Dashboard & báo cáo (M14) — docs/03-modules/14-admin-dashboard.md

/** Khoảng chọn tối đa (quy tắc 4) */
export const MAX_RANGE_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;

/** ?from=&to= (yyyy-mm-dd, giờ VN, gồm cả 2 đầu) — thiếu thì service dùng 7 ngày qua */
export const dashboardRangeQuerySchema = z
  .object({
    from: z.iso.date({ error: 'Ngày bắt đầu không hợp lệ' }).optional(),
    to: z.iso.date({ error: 'Ngày kết thúc không hợp lệ' }).optional(),
  })
  .superRefine((query, ctx) => {
    if (!query.from !== !query.to) {
      ctx.addIssue({
        code: 'custom',
        path: [query.from ? 'to' : 'from'],
        message: 'Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc',
      });
      return;
    }
    if (!query.from || !query.to) return;
    const days = daysBetween(query.from, query.to);
    if (days < 1) {
      ctx.addIssue({ code: 'custom', path: ['to'], message: 'Ngày kết thúc phải từ ngày bắt đầu' });
    } else if (days > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: 'custom',
        path: ['to'],
        message: `Khoảng thời gian tối đa ${MAX_RANGE_DAYS} ngày`,
      });
    }
  });

export const REPORT_TYPES = ['revenue', 'orders', 'top-books'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export type DashboardRangeQuery = z.infer<typeof dashboardRangeQuerySchema>;
