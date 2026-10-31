import { z } from 'zod';
import { keywordSchema, paginationQuerySchema } from './common.schema';

// Admin quản lý khách hàng — docs/03-modules/08-admin-customer-order.md

export const CUSTOMER_SORTS = ['newest', 'spent', 'orders'] as const;

export const customerListQuerySchema = paginationQuerySchema.extend({
  /** Tên · email · SĐT */
  q: keywordSchema,
  status: z.enum(['active', 'locked']).optional(),
  sort: z.enum(CUSTOMER_SORTS).default('newest'),
});

export const lockCustomerSchema = z.object({
  reason: z
    .string({ error: 'Vui lòng nhập lý do khoá' })
    .trim()
    .min(2, 'Vui lòng nhập lý do khoá')
    .max(255, 'Lý do tối đa 255 ký tự'),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
