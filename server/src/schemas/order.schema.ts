import { z } from 'zod';
import { idSchema } from './common.schema';
import { appliedVoucherCodeSchema } from './voucher.schema';

// Đặt hàng — docs/03-modules/06-order.md

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
] as const;
export const PAYMENT_METHODS = ['COD', 'VNPAY'] as const;
export const PAYMENT_STATUSES = ['UNPAID', 'PAID', 'FAILED', 'REFUNDED'] as const;

export const ORDER_NOTE_MAX = 500;

export const createOrderSchema = z.object({
  addressId: idSchema,
  paymentMethod: z.enum(PAYMENT_METHODS, { error: 'Phương thức thanh toán không hợp lệ' }),
  note: z
    .string()
    .trim()
    .max(ORDER_NOTE_MAX, `Ghi chú tối đa ${ORDER_NOTE_MAX} ký tự`)
    .nullish()
    .transform((value) => value || null),
  /** Mã giảm giá (M11) — bỏ trống / null = không dùng */
  voucherCode: z
    .string()
    .trim()
    .nullish()
    .transform((value) => value || null)
    .pipe(appliedVoucherCodeSchema.nullable()),
  /** Tổng tiền client đang thấy — lệch với tổng server tính → PRICE_CHANGED */
  expectedTotal: z.number({ error: 'Thiếu tổng tiền' }).int().min(0),
});

/** Header Idempotency-Key: UUID client tạo mỗi lần mở trang thanh toán */
export const idempotencyKeySchema = z.uuid('Thiếu hoặc sai khoá chống tạo trùng đơn');

export const orderListQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export const cancelOrderSchema = z.object({
  reason: z
    .string({ error: 'Vui lòng chọn lý do huỷ' })
    .trim()
    .min(2, 'Vui lòng nhập lý do huỷ')
    .max(255, 'Lý do tối đa 255 ký tự'),
});

export const orderIdParamSchema = z.object({ id: idSchema });

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
