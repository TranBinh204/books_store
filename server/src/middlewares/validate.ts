import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validate & chuẩn hoá dữ liệu request bằng zod trước khi vào controller.
 * Sai → ZodError → errorHandler trả 422 VALIDATION_ERROR.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    // Express 5: req.query / req.params là getter → ghi đè bằng defineProperty
    if (schemas.query) {
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(req.query),
        writable: true,
      });
    }
    if (schemas.params) {
      Object.defineProperty(req, 'params', {
        value: schemas.params.parse(req.params),
        writable: true,
      });
    }
    next();
  };
}
