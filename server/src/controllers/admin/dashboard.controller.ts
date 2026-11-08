import type { Request, Response } from 'express';
import type { DashboardRangeQuery, ReportType } from '../../schemas/dashboard.schema';
import * as dashboardService from '../../services/dashboard.service';
import * as reportService from '../../services/report.service';
import { sendSuccess } from '../../utils/response';

// /api/admin/dashboard · /api/admin/reports (M14)

const rangeOf = (req: Request) => req.query as unknown as DashboardRangeQuery;

export async function overview(req: Request, res: Response) {
  return sendSuccess(res, await dashboardService.getOverview(rangeOf(req)));
}

export async function tasks(_req: Request, res: Response) {
  return sendSuccess(res, await dashboardService.getTasks());
}

/** Tải file CSV — `type` lấy từ đường dẫn (/reports/<type>.csv) */
export function report(type: ReportType) {
  return async (req: Request, res: Response) => {
    const { filename, content } = await reportService.buildReport(type, rangeOf(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(content);
  };
}
