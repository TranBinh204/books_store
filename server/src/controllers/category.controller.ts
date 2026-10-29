import type { Request, Response } from 'express';
import * as categoryService from '../services/category.service';
import { sendSuccess } from '../utils/response';

// API công khai của cửa hàng (M03) — Admin dùng controllers/admin/category.controller.ts

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function tree(_req: Request, res: Response) {
  return sendSuccess(res, await categoryService.getPublicTree());
}

export async function detail(req: Request, res: Response) {
  return sendSuccess(res, await categoryService.getPublicById(idOf(req)));
}
