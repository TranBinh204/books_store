import type { Request, Response } from 'express';
import type { CreateCategoryInput, UpdateCategoryInput } from '../../schemas/category.schema';
import * as categoryService from '../../services/category.service';
import { sendSuccess } from '../../utils/response';

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function list(_req: Request, res: Response) {
  return sendSuccess(res, await categoryService.listTree());
}

export async function create(req: Request, res: Response) {
  return sendSuccess(res, await categoryService.create(req.body as CreateCategoryInput), 201);
}

export async function update(req: Request, res: Response) {
  return sendSuccess(res, await categoryService.update(idOf(req), req.body as UpdateCategoryInput));
}

export async function remove(req: Request, res: Response) {
  await categoryService.remove(idOf(req));
  return res.status(204).end();
}
