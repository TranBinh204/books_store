import { z } from 'zod';
import { paginationQuerySchema } from './common.schema';

// Flash Sale (M12) — docs/03-modules/12-promotion-flash-sale.md

export const FLASH_SALE_STATUSES = ['ACTIVE', 'UPCOMING', 'ENDED', 'DISABLED'] as const;

/** Trần các ô nhập (chống nhập nhầm số quá lớn) */
const MONEY_MAX = 1_000_000_000;
const QUANTITY_MAX = 1_000_000;
const PER_USER_LIMIT_MAX = 99;
/** Số sách tối đa / chương trình */
export const FLASH_SALE_MAX_ITEMS = 200;

const dateTime = (label: string) =>
  z.iso
    .datetime({ offset: true, error: `${label} không hợp lệ` })
    .transform((value) => new Date(value));

const itemSchema = z.object({
  bookId: z.number({ error: 'Sách không hợp lệ' }).int().positive('Sách không hợp lệ'),
  salePrice: z
    .number({ error: 'Giá sale không hợp lệ' })
    .int('Giá sale phải là số nguyên')
    .positive('Giá sale phải lớn hơn 0')
    .max(MONEY_MAX, 'Giá sale quá lớn'),
  quantity: z
    .number({ error: 'Số suất không hợp lệ' })
    .int('Số suất phải là số nguyên')
    .positive('Số suất phải lớn hơn 0')
    .max(QUANTITY_MAX, 'Số suất quá lớn'),
  perUserLimit: z
    .number({ error: 'Giới hạn / người không hợp lệ' })
    .int()
    .positive('Giới hạn / người phải lớn hơn 0')
    .max(PER_USER_LIMIT_MAX, `Giới hạn / người tối đa ${PER_USER_LIMIT_MAX}`)
    .default(1),
});

/** Body tạo & sửa (PUT gửi toàn bộ) — quy tắc 1, 2 */
export const flashSaleBodySchema = z
  .object({
    name: z
      .string({ error: 'Vui lòng nhập tên chương trình' })
      .trim()
      .transform((value) => value.replace(/\s+/g, ' '))
      .pipe(
        z
          .string()
          .min(1, 'Vui lòng nhập tên chương trình')
          .max(150, 'Tên chương trình tối đa 150 ký tự'),
      ),
    startAt: dateTime('Thời gian bắt đầu'),
    endAt: dateTime('Thời gian kết thúc'),
    isActive: z.boolean({ error: 'Giá trị không hợp lệ' }).default(true),
    items: z
      .array(itemSchema, { error: 'Danh sách sách không hợp lệ' })
      .min(1, 'Vui lòng thêm ít nhất 1 sách')
      .max(FLASH_SALE_MAX_ITEMS, `Tối đa ${FLASH_SALE_MAX_ITEMS} sách / chương trình`),
  })
  .superRefine((body, ctx) => {
    if (body.endAt <= body.startAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
      });
    }
    const seen = new Set<number>();
    body.items.forEach((item, index) => {
      if (seen.has(item.bookId)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'bookId'],
          message: 'Sách bị trùng trong chương trình',
        });
      }
      seen.add(item.bookId);
    });
  });

export const adminFlashSaleQuerySchema = paginationQuerySchema.extend({
  status: z.enum(FLASH_SALE_STATUSES).optional(),
});

export type FlashSaleStatus = (typeof FLASH_SALE_STATUSES)[number];
export type FlashSaleBody = z.infer<typeof flashSaleBodySchema>;
export type AdminFlashSaleQuery = z.infer<typeof adminFlashSaleQuerySchema>;
