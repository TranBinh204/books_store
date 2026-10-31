import type { Request, Response } from 'express';
import type {
  AdminCancelOrderInput,
  AdminOrderListQuery,
  ChangeOrderStatusInput,
} from '../../schemas/admin-order.schema';
import * as orderService from '../../services/order.service';
import { sendSuccess } from '../../utils/response';

// /api/admin/orders — Admin xử lý đơn hàng (M08)

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function list(req: Request, res: Response) {
  const { items, meta } = await orderService.listForAdmin(
    req.query as unknown as AdminOrderListQuery,
  );
  return sendSuccess(res, items, 200, meta);
}

/** Số đơn theo trạng thái + cần hoàn tiền (tab, badge menu) */
export async function summary(_req: Request, res: Response) {
  return sendSuccess(res, { counts: await orderService.countForAdmin() });
}

export async function detail(req: Request, res: Response) {
  return sendSuccess(res, await orderService.getForAdmin(idOf(req)));
}

export async function changeStatus(req: Request, res: Response) {
  return sendSuccess(
    res,
    await orderService.changeStatus(req.user!.id, idOf(req), req.body as ChangeOrderStatusInput),
  );
}

export async function cancel(req: Request, res: Response) {
  return sendSuccess(
    res,
    await orderService.adminCancel(req.user!.id, idOf(req), req.body as AdminCancelOrderInput),
  );
}

export async function refund(req: Request, res: Response) {
  const { note } = req.body as { note: string };
  return sendSuccess(res, await orderService.markRefunded(req.user!.id, idOf(req), note));
}
