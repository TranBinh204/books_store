import { z } from 'zod';
import type { ErrorDetail } from '../utils/AppError';
import { keywordSchema, paginationQuerySchema } from './common.schema';

// Mã giảm giá (M11) — docs/03-modules/11-voucher.md

export const DISCOUNT_TYPES = ['PERCENT', 'FIXED'] as const;
export const VOUCHER_STATUSES = ['ACTIVE', 'UPCOMING', 'EXPIRED', 'USED_UP', 'DISABLED'] as const;

/** Trần các ô tiền (chống nhập nhầm số quá lớn) */
const MONEY_MAX = 1_000_000_000;
const USAGE_LIMIT_MAX = 1_000_000;
const PER_USER_LIMIT_MAX = 1_000;

/** Quy tắc 1: chữ in hoa & số, 4–30 ký tự — nhập chữ thường được tự đổi */
export const voucherCodeSchema = z
  .string({ error: 'Vui lòng nhập mã giảm giá' })
  .trim()
  .toUpperCase()
  .pipe(
    z
      .string()
      .min(1, 'Vui lòng nhập mã giảm giá')
      .regex(/^[A-Z0-9]{4,30}$/, 'Mã gồm 4–30 ký tự, chỉ chữ cái không dấu và chữ số'),
  );

const money = (label: string) =>
  z
    .number({ error: `${label} không hợp lệ` })
    .int(`${label} phải là số nguyên`)
    .max(MONEY_MAX, `${label} quá lớn`);

const dateTime = (label: string) =>
  z.iso
    .datetime({ offset: true, error: `${label} không hợp lệ` })
    .transform((value) => new Date(value));

const fields = {
  code: voucherCodeSchema,
  description: z
    .string()
    .trim()
    .max(255, 'Mô tả tối đa 255 ký tự')
    .nullish()
    .transform((value) => value || null),
  discountType: z.enum(DISCOUNT_TYPES, { error: 'Loại giảm giá không hợp lệ' }),
  discountValue: money('Mức giảm').positive('Mức giảm phải lớn hơn 0'),
  /** Trần giảm khi PERCENT — null = không giới hạn */
  maxDiscount: money('Giảm tối đa').positive('Giảm tối đa phải lớn hơn 0').nullable(),
  minOrderValue: money('Đơn tối thiểu').min(0, 'Đơn tối thiểu không được âm'),
  startAt: dateTime('Thời gian bắt đầu'),
  endAt: dateTime('Thời gian kết thúc'),
  /** null = không giới hạn */
  usageLimit: z
    .number({ error: 'Tổng lượt không hợp lệ' })
    .int()
    .positive('Tổng lượt phải lớn hơn 0')
    .max(USAGE_LIMIT_MAX, 'Tổng lượt quá lớn')
    .nullable(),
  perUserLimit: z
    .number({ error: 'Lượt / người không hợp lệ' })
    .int()
    .positive('Lượt / người phải lớn hơn 0')
    .max(PER_USER_LIMIT_MAX, 'Lượt / người quá lớn'),
  isPublic: z.boolean({ error: 'Giá trị không hợp lệ' }),
  isActive: z.boolean({ error: 'Giá trị không hợp lệ' }),
};

/** Ràng buộc giữa các trường — dùng cho cả tạo (schema) lẫn sửa (service, sau khi gộp giá trị cũ) */
export function voucherRuleIssues(voucher: {
  discountType: (typeof DISCOUNT_TYPES)[number];
  discountValue: number;
  startAt: Date;
  endAt: Date;
}): ErrorDetail[] {
  const issues: ErrorDetail[] = [];
  if (voucher.discountType === 'PERCENT' && voucher.discountValue > 100) {
    issues.push({ field: 'discountValue', message: 'Giảm theo % tối đa 100%' });
  }
  if (voucher.endAt <= voucher.startAt) {
    issues.push({ field: 'endAt', message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
  }
  return issues;
}

export const createVoucherSchema = z
  .object({
    ...fields,
    maxDiscount: fields.maxDiscount.default(null),
    minOrderValue: fields.minOrderValue.default(0),
    usageLimit: fields.usageLimit.default(null),
    perUserLimit: fields.perUserLimit.default(1),
    isPublic: fields.isPublic.default(false),
    isActive: fields.isActive.default(true),
  })
  .superRefine((voucher, ctx) => {
    for (const issue of voucherRuleIssues(voucher)) {
      ctx.addIssue({ code: 'custom', path: [issue.field], message: issue.message });
    }
  });

/** Gửi các trường muốn đổi — ràng buộc giữa các trường kiểm tra ở service */
export const updateVoucherSchema = z
  .object({
    code: fields.code.optional(),
    description: fields.description.optional(),
    discountType: fields.discountType.optional(),
    discountValue: fields.discountValue.optional(),
    maxDiscount: fields.maxDiscount.optional(),
    minOrderValue: fields.minOrderValue.optional(),
    startAt: fields.startAt.optional(),
    endAt: fields.endAt.optional(),
    usageLimit: fields.usageLimit.optional(),
    perUserLimit: fields.perUserLimit.optional(),
    isPublic: fields.isPublic.optional(),
    isActive: fields.isActive.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Không có gì để cập nhật',
  });

export const adminVoucherQuerySchema = paginationQuerySchema.extend({
  /** Mã · mô tả */
  q: keywordSchema,
  status: z.enum(VOUCHER_STATUSES).optional(),
  visibility: z.enum(['public', 'private']).optional(),
});

/**
 * Mã khách nhập (trang thanh toán): chỉ chuẩn hoá — sai định dạng coi như không tồn tại
 * (trả VOUCHER_NOT_FOUND, không báo lỗi định dạng)
 */
export const appliedVoucherCodeSchema = z
  .string({ error: 'Vui lòng nhập mã giảm giá' })
  .trim()
  .toUpperCase()
  .pipe(z.string().min(1, 'Vui lòng nhập mã giảm giá').max(50, 'Mã giảm giá không tồn tại'));

export const checkVoucherSchema = z.object({ code: appliedVoucherCodeSchema });

export type DiscountType = (typeof DISCOUNT_TYPES)[number];
export type VoucherStatus = (typeof VOUCHER_STATUSES)[number];
export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;
export type AdminVoucherQuery = z.infer<typeof adminVoucherQuerySchema>;
