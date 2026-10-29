import { z } from 'zod';
import { idSchema, keywordSchema } from './common.schema';

// Giới hạn của API cửa hàng (M03) — theo docs/03-modules/03-catalog.md
export const PUBLIC_BOOK_MAX_LIMIT = 48;
export const PUBLIC_BOOK_DEFAULT_LIMIT = 20;
export const RELATED_BOOK_LIMIT = 10;
export const SUGGESTION_LIMIT = 6;
/** Gõ ít hơn số ký tự này → không gợi ý */
export const SUGGESTION_MIN_LENGTH = 2;
/** Trang chi tiết: số lượng chọn tối đa (và không vượt tồn kho) */
export const BOOK_MAX_SELECT_QUANTITY = 99;

const MAX_PRICE = 1_000_000_000;

/** `relevance` chỉ có nghĩa khi có từ khoá — không có `q` thì coi như `created_desc` */
export const PUBLIC_BOOK_SORTS = [
  'created_desc',
  'created_asc',
  'sold_desc',
  'price_asc',
  'price_desc',
  'title_asc',
  'title_desc',
  'relevance',
] as const;

/** "2,5,5" → [2, 5] (bỏ trùng); rỗng → undefined */
const idListSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? [...new Set(value.split(',').map(Number))] : undefined))
  .pipe(
    z
      .array(
        z.number({ error: 'id không hợp lệ' }).int('id không hợp lệ').positive('id không hợp lệ'),
      )
      .max(50)
      .optional(),
  );

const priceFilter = z.coerce.number().int().min(0).max(MAX_PRICE).optional();

export const publicBookListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(PUBLIC_BOOK_MAX_LIMIT)
      .default(PUBLIC_BOOK_DEFAULT_LIMIT),
    q: keywordSchema,
    categoryId: idSchema.optional(),
    authorId: idSchema.optional(),
    publisherIds: idListSchema,
    minPrice: priceFilter,
    maxPrice: priceFilter,
    /** Bỏ trống: có `q` → relevance, không có → created_desc */
    sort: z.enum(PUBLIC_BOOK_SORTS, { error: 'Kiểu sắp xếp không hợp lệ' }).optional(),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    path: ['maxPrice'],
    message: '"Giá đến" phải lớn hơn hoặc bằng "Giá từ"',
  });

export const bookFacetQuerySchema = z.object({
  categoryId: idSchema,
});

export const suggestionQuerySchema = z.object({
  q: keywordSchema,
});

export type PublicBookListQuery = z.infer<typeof publicBookListQuerySchema>;
export type PublicBookSort = (typeof PUBLIC_BOOK_SORTS)[number];
