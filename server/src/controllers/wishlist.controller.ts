import type { Request, Response } from 'express';
import type { WishlistQuery } from '../schemas/wishlist.schema';
import * as wishlistService from '../services/wishlist.service';
import { sendSuccess } from '../utils/response';

// /api/me/wishlist — sách yêu thích của khách hàng đang đăng nhập (M09)

const bookIdOf = (req: Request) => (req.params as unknown as { bookId: number }).bookId;

export async function list(req: Request, res: Response) {
  const { items, meta } = await wishlistService.listWishlist(
    req.user!.id,
    req.query as unknown as WishlistQuery,
  );
  return sendSuccess(res, items, 200, meta);
}

/** Id các sách đã thích — client tô ♥ trên mọi thẻ sách */
export async function ids(req: Request, res: Response) {
  return sendSuccess(res, { bookIds: await wishlistService.listBookIds(req.user!.id) });
}

export async function add(req: Request, res: Response) {
  const bookId = bookIdOf(req);
  const { count } = await wishlistService.addBook(req.user!.id, bookId);
  return sendSuccess(res, { bookId, count });
}

export async function remove(req: Request, res: Response) {
  await wishlistService.removeBook(req.user!.id, bookIdOf(req));
  return res.status(204).end();
}
