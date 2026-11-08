import { Router } from 'express';
import * as dashboardController from '../../controllers/admin/dashboard.controller';
import { validate } from '../../middlewares/validate';
import { dashboardRangeQuerySchema, REPORT_TYPES } from '../../schemas/dashboard.schema';
import { asyncHandler } from '../../utils/asyncHandler';

const validateRange = validate({ query: dashboardRangeQuerySchema });

// /api/admin/dashboard (M14)
export const dashboardRoutes = Router();

dashboardRoutes.get('/overview', validateRange, asyncHandler(dashboardController.overview));
dashboardRoutes.get('/tasks', asyncHandler(dashboardController.tasks));

// /api/admin/reports/<loại>.csv (M14 quy tắc 10)
export const reportRoutes = Router();

for (const type of REPORT_TYPES) {
  reportRoutes.get(`/${type}.csv`, validateRange, asyncHandler(dashboardController.report(type)));
}
