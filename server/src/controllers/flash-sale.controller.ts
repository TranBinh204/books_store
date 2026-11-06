import type { Request, Response } from 'express';
import * as flashSaleService from '../services/flash-sale.service';
import { sendSuccess } from '../utils/response';

// Flash Sale (M12) — Admin dùng controllers/admin/flash-sale.controller.ts

/** GET /api/flash-sales/current — chương trình đang chạy hoặc null */
export async function current(_req: Request, res: Response) {
  return sendSuccess(res, await flashSaleService.getCurrent());
}

/** GET /api/flash-sales/upcoming — chương trình sắp diễn ra sớm nhất hoặc null */
export async function upcoming(_req: Request, res: Response) {
  return sendSuccess(res, await flashSaleService.getUpcoming());
}
