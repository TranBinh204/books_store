import type { Request, Response } from 'express';
import type { AdminFlashSaleQuery, FlashSaleBody } from '../../schemas/flash-sale.schema';
import * as flashSaleService from '../../services/flash-sale.service';
import { sendSuccess } from '../../utils/response';

// /api/admin/flash-sales (M12)

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function list(req: Request, res: Response) {
  const { items, meta } = await flashSaleService.listForAdmin(
    req.query as unknown as AdminFlashSaleQuery,
  );
  return sendSuccess(res, items, 200, meta);
}

export async function detail(req: Request, res: Response) {
  return sendSuccess(res, await flashSaleService.getForAdmin(idOf(req)));
}

export async function create(req: Request, res: Response) {
  return sendSuccess(res, await flashSaleService.create(req.body as FlashSaleBody), 201);
}

export async function update(req: Request, res: Response) {
  return sendSuccess(res, await flashSaleService.update(idOf(req), req.body as FlashSaleBody));
}

export async function stop(req: Request, res: Response) {
  return sendSuccess(res, await flashSaleService.stop(idOf(req)));
}

export async function remove(req: Request, res: Response) {
  await flashSaleService.remove(idOf(req));
  return res.status(204).end();
}
