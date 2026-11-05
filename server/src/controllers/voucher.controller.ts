import type { Request, Response } from 'express';
import * as voucherService from '../services/voucher.service';
import { sendSuccess } from '../utils/response';

// Mã giảm giá (M11) — Admin dùng controllers/admin/voucher.controller.ts

/** GET /api/vouchers — mã công khai cho trang chủ */
export async function listPublic(_req: Request, res: Response) {
  return sendSuccess(res, await voucherService.listPublic());
}

/** POST /api/me/vouchers/check — kiểm tra mã với giỏ hàng của tôi */
export async function check(req: Request, res: Response) {
  const { code } = req.body as { code: string };
  return sendSuccess(res, await voucherService.check(req.user!.id, code));
}
