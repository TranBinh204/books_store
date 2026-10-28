import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '../types/api.types';
import { AppError } from '../utils/AppError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    return res.status(err.statusCode).json(body);
  }

  if (err instanceof ZodError) {
    const body: ApiError = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
    return res.status(422).json(body);
  }

  // Lỗi không lường trước: chỉ ghi log ở server, không trả chi tiết ra ngoài
  console.error(err);
  const body: ApiError = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra, vui lòng thử lại sau' },
  };
  return res.status(500).json(body);
}
