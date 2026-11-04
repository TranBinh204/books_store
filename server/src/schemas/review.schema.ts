import { z } from 'zod';
import { idSchema, keywordSchema, paginationQuerySchema } from './common.schema';

// Đánh giá sách — docs/03-modules/10-review.md

export const REVIEW_CONTENT_MIN = 10;
export const REVIEW_CONTENT_MAX = 1000;

const ratingSchema = z
  .number({ error: 'Vui lòng chọn số sao' })
  .int()
  .min(1, 'Vui lòng chọn từ 1 đến 5 sao')
  .max(5, 'Vui lòng chọn từ 1 đến 5 sao');

/** Tuỳ chọn; có nhập thì 10–1000 ký tự (quy tắc 3) */
const contentSchema = z
  .string()
  .nullish()
  .transform((value) => value?.trim().replace(/\s+/g, ' ') || null)
  .refine((value) => value === null || value.length >= REVIEW_CONTENT_MIN, {
    message: `Nhận xét tối thiểu ${REVIEW_CONTENT_MIN} ký tự`,
  })
  .refine((value) => value === null || value.length <= REVIEW_CONTENT_MAX, {
    message: `Nhận xét tối đa ${REVIEW_CONTENT_MAX} ký tự`,
  });

export const createReviewSchema = z.object({
  orderId: idSchema,
  bookId: idSchema,
  rating: ratingSchema,
  content: contentSchema,
});

export const updateReviewSchema = z.object({
  rating: ratingSchema,
  content: contentSchema,
});

export const publicReviewQuerySchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  /** Chỉ đánh giá có nội dung */
  withContent: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const ADMIN_REVIEW_SORTS = ['newest', 'rating_asc'] as const;

export const adminReviewQuerySchema = paginationQuerySchema.extend({
  /** Tên sách · tên / email khách · nội dung */
  q: keywordSchema,
  rating: z.coerce.number().int().min(1).max(5).optional(),
  status: z.enum(['visible', 'hidden']).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  sort: z.enum(ADMIN_REVIEW_SORTS).default('newest'),
});

export const hideReviewSchema = z.object({
  reason: z
    .string({ error: 'Vui lòng chọn lý do ẩn' })
    .trim()
    .min(2, 'Vui lòng nhập lý do ẩn')
    .max(255, 'Lý do tối đa 255 ký tự'),
});

export const bookIdParamSchema = z.object({ bookId: idSchema });

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type PublicReviewQuery = z.infer<typeof publicReviewQuerySchema>;
export type AdminReviewQuery = z.infer<typeof adminReviewQuerySchema>;
