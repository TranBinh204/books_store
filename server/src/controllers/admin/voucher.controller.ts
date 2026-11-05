import type { Request, Response } from 'express';
import type { PageParams } from '../../utils/pagination';
import type {
  AdminVoucherQuery,
  CreateVoucherInput,
  UpdateVoucherInput,
} from '../../schemas/voucher.schema';
import * as voucherService from '../../services/voucher.service';
import { sendSuccess } from '../../utils/response';

// /api/admin/vouchers (M11)

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function list(req: Request, res: Response) {
  const { items, meta } = await voucherService.listForAdmin(
    req.query as unknown as AdminVoucherQuery,
  );
  return sendSuccess(res, items, 200, meta);
}

export async function detail(req: Request, res: Response) {
  return sendSuccess(res, await voucherService.getForAdmin(idOf(req)));
}

export async function create(req: Request, res: Response) {
  return sendSuccess(res, await voucherService.create(req.body as CreateVoucherInput), 201);
}

export async function update(req: Request, res: Response) {
  return sendSuccess(res, await voucherService.update(idOf(req), req.body as UpdateVoucherInput));
}

export async function remove(req: Request, res: Response) {
  await voucherService.remove(idOf(req));
  return res.status(204).end();
}

export async function orders(req: Request, res: Response) {
  const { items, meta } = await voucherService.listOrders(
    idOf(req),
    req.query as unknown as PageParams,
  );
  return sendSuccess(res, items, 200, meta);
}
