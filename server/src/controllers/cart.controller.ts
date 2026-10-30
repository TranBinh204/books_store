import type { Request, Response } from 'express';
import type { CartLineInput } from '../schemas/cart.schema';
import * as cartService from '../services/cart.service';
import { sendSuccess } from '../utils/response';

// Giỏ hàng (M05): /api/cart/preview (khách) · /api/me/cart (tài khoản)

const bookIdOf = (req: Request) => (req.params as unknown as { bookId: number }).bookId;
const linesOf = (req: Request) => (req.body as { items: CartLineInput[] }).items;

/** Giỏ của khách lưu ở trình duyệt → thông tin hiện tại từng sách (không lưu gì) */
export async function preview(req: Request, res: Response) {
  return sendSuccess(res, await cartService.preview(linesOf(req)));
}

export async function getCart(req: Request, res: Response) {
  return sendSuccess(res, await cartService.getCart(req.user!.id));
}

export async function addItem(req: Request, res: Response) {
  return sendSuccess(res, await cartService.addItem(req.user!.id, req.body as CartLineInput));
}

export async function setQuantity(req: Request, res: Response) {
  const { quantity } = req.body as { quantity: number };
  return sendSuccess(res, await cartService.setQuantity(req.user!.id, bookIdOf(req), quantity));
}

export async function removeItem(req: Request, res: Response) {
  return sendSuccess(res, await cartService.removeItem(req.user!.id, bookIdOf(req)));
}

export async function clear(req: Request, res: Response) {
  await cartService.clear(req.user!.id);
  return res.status(204).end();
}

export async function merge(req: Request, res: Response) {
  return sendSuccess(res, await cartService.merge(req.user!.id, linesOf(req)));
}
