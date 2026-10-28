import type { Response } from 'express';
import type { ApiSuccess, PaginationMeta } from '../types/api.types';

/** Trả response thành công theo format chuẩn { success, data, meta? } */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta) {
  const body: ApiSuccess<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}
