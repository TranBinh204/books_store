import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Bọc controller async để lỗi tự chuyển đến errorHandler.
 * (Express 5 đã tự bắt lỗi của async handler, nhưng giữ helper này để code thống nhất.)
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
