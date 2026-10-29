import type { Request, Response } from 'express';
import * as bookService from '../services/book.service';
import { sendSuccess } from '../utils/response';

/** Gợi ý khi gõ ô tìm kiếm trên Header */
export async function suggestions(req: Request, res: Response) {
  const { q } = req.query as { q?: string };
  return sendSuccess(res, await bookService.suggest(q));
}
