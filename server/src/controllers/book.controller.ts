import type { Request, Response } from 'express';
import type { PublicBookListQuery } from '../schemas/book-public.schema';
import * as bookService from '../services/book.service';
import { sendSuccess } from '../utils/response';

// API công khai của cửa hàng (M03) — Admin dùng controllers/admin/book.controller.ts

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function list(req: Request, res: Response) {
  const { items, meta } = await bookService.listPublic(req.query as unknown as PublicBookListQuery);
  return sendSuccess(res, items, 200, meta);
}

export async function detail(req: Request, res: Response) {
  return sendSuccess(res, await bookService.getPublicDetail(idOf(req)));
}

export async function related(req: Request, res: Response) {
  return sendSuccess(res, await bookService.getRelated(idOf(req)));
}

export async function facets(req: Request, res: Response) {
  const { categoryId } = req.query as unknown as { categoryId: number };
  return sendSuccess(res, await bookService.getFacets(categoryId));
}
