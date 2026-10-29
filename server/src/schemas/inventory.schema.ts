import { z } from 'zod';
import { idSchema, keywordSchema, paginationQuerySchema } from './common.schema';

const MAX_STOCK = 1_000_000;

export const changeStockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('IMPORT'),
    quantity: z
      .number({ error: 'Vui lòng nhập số lượng' })
      .int('Số lượng phải là số nguyên')
      .positive('Số lượng nhập phải lớn hơn 0')
      .max(MAX_STOCK),
    note: z
      .string()
      .trim()
      .max(500, 'Ghi chú tối đa 500 ký tự')
      .nullish()
      .transform((value) => value || null),
  }),
  z.object({
    type: z.literal('ADJUST'),
    newStock: z
      .number({ error: 'Vui lòng nhập tồn kho thực tế' })
      .int('Tồn kho phải là số nguyên')
      .min(0, 'Tồn kho không được âm')
      .max(MAX_STOCK),
    note: z
      .string({ error: 'Vui lòng ghi lý do điều chỉnh' })
      .trim()
      .min(1, 'Vui lòng ghi lý do điều chỉnh')
      .max(500, 'Ghi chú tối đa 500 ký tự'),
  }),
]);

export const inventoryLogQuerySchema = paginationQuerySchema.extend({
  /** Tìm theo tên sách (không dấu) */
  q: keywordSchema,
  bookId: idSchema.optional(),
  reason: z.enum(['IMPORT', 'ADJUST', 'ORDER', 'CANCEL']).optional(),
  /** Ngày bắt đầu (yyyy-mm-dd, tính theo giờ Việt Nam) */
  from: z.iso.date().optional(),
  /** Ngày kết thúc (bao gồm cả ngày này) */
  to: z.iso.date().optional(),
});

export type ChangeStockInput = z.infer<typeof changeStockSchema>;
export type InventoryLogQuery = z.infer<typeof inventoryLogQuerySchema>;
