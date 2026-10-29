import { z } from 'zod';
import { keywordSchema, nameSchema, paginationQuerySchema } from './common.schema';

export const namedEntityBodySchema = z.object({
  name: nameSchema(150, 'tên'),
});

export const namedEntityListQuerySchema = paginationQuerySchema.extend({
  q: keywordSchema,
});

export type NamedEntityBody = z.infer<typeof namedEntityBodySchema>;
export type NamedEntityListQuery = z.infer<typeof namedEntityListQuerySchema>;
