import { z } from 'zod';
import { idSchema, keywordSchema, paginationQuerySchema } from './common.schema';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from './order.schema';

// Admin xử lý đơn hàng — docs/03-modules/08-admin-customer-order.md

export const ADMIN_ORDER_SORTS = ['created_desc', 'created_asc', 'total_desc'] as const;

export const adminOrderListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  /** Tab "Cần hoàn tiền": đơn đã huỷ nhưng đã nhận tiền */
  needsRefund: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  /** Ngày đặt từ / đến (yyyy-mm-dd, giờ Việt Nam, gồm cả 2 đầu) */
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  /** Mã đơn · SĐT người nhận · tên người nhận / khách · email khách */
  q: keywordSchema,
  userId: idSchema.optional(),
  sort: z.enum(ADMIN_ORDER_SORTS).default('created_desc'),
});

const noteSchema = z
  .string()
  .trim()
  .max(255, 'Ghi chú tối đa 255 ký tự')
  .nullish()
  .transform((value) => value || null);

const expectedStatusSchema = z.enum(ORDER_STATUSES, { error: 'Thiếu trạng thái hiện tại của đơn' });

/** Chuyển sang bước kế tiếp — chỉ các trạng thái Admin bấm được */
export const changeOrderStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'SHIPPING', 'DELIVERED'], { error: 'Trạng thái không hợp lệ' }),
  /** Trạng thái Admin đang thấy — khác thực tế → 409 ORDER_STATUS_CHANGED */
  expectedStatus: expectedStatusSchema,
  note: noteSchema,
});

export const adminCancelOrderSchema = z.object({
  reason: z
    .string({ error: 'Vui lòng chọn lý do huỷ' })
    .trim()
    .min(2, 'Vui lòng nhập lý do huỷ')
    .max(255, 'Lý do tối đa 255 ký tự'),
  expectedStatus: expectedStatusSchema,
});

export const refundOrderSchema = z.object({
  note: z
    .string({ error: 'Vui lòng ghi chú thông tin hoàn tiền' })
    .trim()
    .min(2, 'Vui lòng ghi chú thông tin hoàn tiền (vd mã giao dịch hoàn)')
    .max(255, 'Ghi chú tối đa 255 ký tự'),
});

export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
export type ChangeOrderStatusInput = z.infer<typeof changeOrderStatusSchema>;
export type AdminCancelOrderInput = z.infer<typeof adminCancelOrderSchema>;
