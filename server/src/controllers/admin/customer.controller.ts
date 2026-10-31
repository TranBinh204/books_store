import type { Request, Response } from 'express';
import type { CustomerListQuery } from '../../schemas/customer.schema';
import * as customerService from '../../services/customer.service';
import { sendSuccess } from '../../utils/response';

// /api/admin/customers — Admin quản lý khách hàng (M08)

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function list(req: Request, res: Response) {
  const { items, meta } = await customerService.listCustomers(
    req.query as unknown as CustomerListQuery,
  );
  return sendSuccess(res, items, 200, meta);
}

export async function detail(req: Request, res: Response) {
  return sendSuccess(res, await customerService.getCustomer(idOf(req)));
}

export async function lock(req: Request, res: Response) {
  const { reason } = req.body as { reason: string };
  return sendSuccess(res, await customerService.lockCustomer(idOf(req), reason));
}

export async function unlock(req: Request, res: Response) {
  return sendSuccess(res, await customerService.unlockCustomer(idOf(req)));
}
