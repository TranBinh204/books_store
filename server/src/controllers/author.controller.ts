import type { Request, Response } from 'express';
import type { AuthorSearchQuery } from '../schemas/author.schema';
import { authorService } from '../services/named-entity.service';
import { escapeLike } from '../utils/sql';
import { sendSuccess } from '../utils/response';

// API công khai của cửa hàng (M03): tên tác giả cho trang "Sách của tác giả"

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function detail(req: Request, res: Response) {
  const { id, name } = await authorService.getById(idOf(req));
  return sendSuccess(res, { id, name });
}

/** Tìm theo tên (không dấu) — chỉ trả id + tên */
export async function search(req: Request, res: Response) {
  const { q, limit } = req.query as unknown as AuthorSearchQuery;
  const { items } = await authorService.list(q ? escapeLike(q) : undefined, { page: 1, limit });
  return sendSuccess(
    res,
    items.map(({ id, name }) => ({ id, name })),
  );
}
