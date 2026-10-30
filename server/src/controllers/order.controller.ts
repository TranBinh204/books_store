import type { Request, Response } from 'express';
import {
  idempotencyKeySchema,
  type CreateOrderInput,
  type OrderListQuery,
} from '../schemas/order.schema';
import * as orderService from '../services/order.service';
import { sendSuccess } from '../utils/response';

// /api/me/orders — đơn hàng của khách hàng đang đăng nhập (M06)

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

/** Header `Idempotency-Key` bắt buộc (UUID) — sai → ZodError → 422 */
export async function create(req: Request, res: Response) {
  const key = idempotencyKeySchema.parse(req.get('idempotency-key'));
  const { order, created } = await orderService.createOrder(
    req.user!.id,
    req.body as CreateOrderInput,
    key,
  );
  // Gửi lại cùng khoá → 200 + đơn đã tạo trước đó
  return sendSuccess(res, order, created ? 201 : 200);
}

export async function list(req: Request, res: Response) {
  const { items, meta } = await orderService.listOrders(
    req.user!.id,
    req.query as unknown as OrderListQuery,
  );
  return sendSuccess(res, items, 200, meta);
}

/** Số đơn theo từng trạng thái (tab "Đơn hàng của tôi") */
export async function summary(req: Request, res: Response) {
  return sendSuccess(res, { counts: await orderService.countOrders(req.user!.id) });
}

export async function detail(req: Request, res: Response) {
  return sendSuccess(res, await orderService.getOrder(req.user!.id, idOf(req)));
}

export async function cancel(req: Request, res: Response) {
  const { reason } = req.body as { reason: string };
  return sendSuccess(res, await orderService.cancelOrder(req.user!.id, idOf(req), reason));
}
