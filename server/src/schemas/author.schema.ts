import { z } from 'zod';
import { keywordSchema } from './common.schema';

/** GET /api/authors?q=&limit= — ô tìm & chọn tác giả (M15) */
export const authorSearchQuerySchema = z.object({
  q: keywordSchema,
  limit: z.coerce.number().int().positive().max(20).default(10),
});

export type AuthorSearchQuery = z.infer<typeof authorSearchQuerySchema>;
