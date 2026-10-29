import type { NextFunction, Request, RequestHandler, Response } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

function invalidImage(message: string) {
  return new AppError(400, 'INVALID_IMAGE', message);
}

function imageMulter(maxFiles: number) {
  return multer({
    // Giữ trong bộ nhớ → kiểm tra nội dung rồi mới lưu (local / Cloudinary)
    storage: multer.memoryStorage(),
    limits: { fileSize: env.UPLOAD_MAX_FILE_MB * 1024 * 1024, files: maxFiles },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
      cb(invalidImage(`Ảnh "${file.originalname}" không đúng định dạng (chỉ nhận jpg, png, webp)`));
    },
  });
}

/** Bọc middleware multer: lỗi multer → 400 INVALID_IMAGE với câu thông báo tiếng Việt */
function withImageErrors(
  handler: RequestHandler,
  messages: Partial<Record<multer.ErrorCode, string>>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: unknown) => {
      if (!err) return next();
      if (err instanceof AppError) return next(err);
      if (err instanceof multer.MulterError) {
        const sizeMessage = `Mỗi ảnh tối đa ${env.UPLOAD_MAX_FILE_MB} MB`;
        return next(
          invalidImage(
            err.code === 'LIMIT_FILE_SIZE'
              ? sizeMessage
              : (messages[err.code] ?? 'Upload ảnh thất bại'),
          ),
        );
      }
      next(err);
    });
  };
}

/** Nhận nhiều ảnh ở trường `files` (multipart/form-data) — ảnh sách */
export const uploadImages = withImageErrors(
  imageMulter(env.BOOK_MAX_IMAGES).array('files', env.BOOK_MAX_IMAGES),
  {
    LIMIT_FILE_COUNT: `Tối đa ${env.BOOK_MAX_IMAGES} ảnh mỗi lần`,
    LIMIT_UNEXPECTED_FILE: `Tối đa ${env.BOOK_MAX_IMAGES} ảnh, gửi ở trường "files"`,
  },
);
