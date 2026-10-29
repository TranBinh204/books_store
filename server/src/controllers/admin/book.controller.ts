import type { Request, Response } from 'express';
import type { BookListQuery, CreateBookInput, UpdateBookInput } from '../../schemas/book.schema';
import type { ChangeStockInput } from '../../schemas/inventory.schema';
import * as bookService from '../../services/book.service';
import * as inventoryService from '../../services/inventory.service';
import { sendSuccess } from '../../utils/response';

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function list(req: Request, res: Response) {
  const { items, meta } = await bookService.list(req.query as unknown as BookListQuery);
  return sendSuccess(res, items, 200, meta);
}

export async function detail(req: Request, res: Response) {
  return sendSuccess(res, await bookService.getDetail(idOf(req)));
}

export async function create(req: Request, res: Response) {
  const book = await bookService.create(req.body as CreateBookInput, req.user!.id);
  return sendSuccess(res, book, 201);
}

export async function update(req: Request, res: Response) {
  return sendSuccess(res, await bookService.update(idOf(req), req.body as UpdateBookInput));
}

export async function setStatus(req: Request, res: Response) {
  const { isActive } = req.body as { isActive: boolean };
  return sendSuccess(res, await bookService.setStatus(idOf(req), isActive));
}

export async function changeStock(req: Request, res: Response) {
  const result = await inventoryService.changeStock(
    idOf(req),
    req.body as ChangeStockInput,
    req.user!.id,
  );
  return sendSuccess(res, result);
}
