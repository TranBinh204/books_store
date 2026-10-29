import type { Request, Response } from 'express';
import * as homeService from '../services/home.service';
import { sendSuccess } from '../utils/response';

/** GET /api/home — dữ liệu công khai của trang chủ gom 1 lần (có cache) */
export async function get(_req: Request, res: Response) {
  return sendSuccess(res, await homeService.getHome());
}
