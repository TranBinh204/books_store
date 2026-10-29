import { z } from 'zod';
import { env } from '../config/env';
import { idSchema, keywordSchema, paginationQuerySchema } from './common.schema';

const MAX_PRICE = 1_000_000_000;
const MAX_STOCK = 1_000_000;

/** Chuỗi không bắt buộc: bỏ khoảng trắng thừa, rỗng → null */
function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} tối đa ${max} ký tự`)
    .nullish()
    .transform((value) => value || null);
}

function optionalPositiveInt(max: number, label: string) {
  return z
    .number({ error: `${label} phải là số` })
    .int(`${label} phải là số nguyên`)
    .positive(`${label} phải lớn hơn 0`)
    .max(max, `${label} tối đa ${max}`)
    .nullish()
    .transform((value) => value ?? null);
}

/** ISBN: bỏ dấu "-" và khoảng trắng; 10 hoặc 13 ký tự (ISBN-10 có thể kết thúc bằng X) */
const isbnSchema = z
  .string()
  .nullish()
  .transform((value) => value?.replace(/[-\s]/g, '').toUpperCase() || null)
  .refine(
    (value) => value === null || /^(\d{9}[\dX]|\d{13})$/.test(value),
    'ISBN gồm 10 hoặc 13 chữ số',
  );

const priceSchema = (label: string) =>
  z
    .number({ error: `Vui lòng nhập ${label}` })
    .int(`${label} phải là số nguyên`)
    .min(0, `${label} không được âm`)
    .max(MAX_PRICE, `${label} quá lớn`);

const imageSchema = z.object({
  url: z.string().min(1).max(1000),
  publicId: z.string().min(1).max(255),
});

const bookFields = z.object({
  title: z
    .string({ error: 'Vui lòng nhập tên sách' })
    .trim()
    .min(1, 'Vui lòng nhập tên sách')
    .max(255, 'Tên sách tối đa 255 ký tự'),
  categoryId: idSchema,
  authorIds: z
    .array(idSchema)
    .min(1, 'Chọn ít nhất 1 tác giả')
    .max(10, 'Tối đa 10 tác giả')
    .refine((ids) => new Set(ids).size === ids.length, 'Tác giả bị trùng'),
  publisherId: idSchema.nullish().transform((value) => value ?? null),
  isbn: isbnSchema,
  description: optionalText(10_000, 'Mô tả'),
  publishYear: z
    .number()
    .int()
    .min(1900, 'Năm xuất bản từ 1900')
    .max(new Date().getFullYear() + 1, 'Năm xuất bản không hợp lệ')
    .nullish()
    .transform((value) => value ?? null),
  pages: optionalPositiveInt(100_000, 'Số trang'),
  size: optionalText(30, 'Kích thước'),
  weightGram: optionalPositiveInt(100_000, 'Trọng lượng'),
  coverType: z
    .enum(['PAPERBACK', 'HARDCOVER'])
    .nullish()
    .transform((value) => value ?? null),
  originalPrice: priceSchema('giá bìa'),
  price: priceSchema('giá bán'),
  isActive: z.boolean().optional().default(true),
  images: z
    .array(imageSchema)
    .max(env.BOOK_MAX_IMAGES, `Tối đa ${env.BOOK_MAX_IMAGES} ảnh`)
    .optional()
    .default([]),
});

function priceNotAboveOriginal<T extends { price: number; originalPrice: number }>(value: T) {
  return value.price <= value.originalPrice;
}
const priceRule = { path: ['price'], message: 'Giá bán không được lớn hơn giá bìa' };

export const createBookSchema = bookFields
  .extend({
    initialStock: z
      .number()
      .int('Tồn kho phải là số nguyên')
      .min(0, 'Tồn kho không được âm')
      .max(MAX_STOCK)
      .optional()
      .default(0),
  })
  .refine(priceNotAboveOriginal, priceRule);

/** Sửa sách: gửi lại toàn bộ thông tin (trừ tồn kho) */
export const updateBookSchema = bookFields.refine(priceNotAboveOriginal, priceRule);

export const bookStatusSchema = z.object({
  isActive: z.boolean({ error: 'Thiếu trạng thái' }),
});

export const BOOK_SORTS = [
  'created_desc',
  'created_asc',
  'title_asc',
  'price_asc',
  'price_desc',
  'stock_asc',
  'stock_desc',
  'sold_desc',
] as const;

const priceFilter = z.coerce.number().int().min(0).max(MAX_PRICE).optional();

export const bookListQuerySchema = paginationQuerySchema
  .extend({
    q: keywordSchema,
    categoryId: idSchema.optional(),
    /** Lọc theo tác giả / nhà xuất bản (link từ trang Tác giả, NXB) */
    authorId: idSchema.optional(),
    publisherId: idSchema.optional(),
    status: z.enum(['active', 'hidden']).optional(),
    stock: z.enum(['low', 'out']).optional(),
    /** Ngày thêm sách từ / đến (yyyy-mm-dd, giờ Việt Nam, gồm cả 2 đầu) */
    createdFrom: z.iso.date().optional(),
    createdTo: z.iso.date().optional(),
    /** Khoảng giá BÁN (VND, gồm cả 2 đầu) */
    minPrice: priceFilter,
    maxPrice: priceFilter,
    sort: z.enum(BOOK_SORTS).optional().default('created_desc'),
  })
  .refine((q) => !q.createdFrom || !q.createdTo || q.createdFrom <= q.createdTo, {
    path: ['createdTo'],
    message: '"Đến ngày" phải sau hoặc bằng "Từ ngày"',
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    path: ['maxPrice'],
    message: '"Giá đến" phải lớn hơn hoặc bằng "Giá từ"',
  });

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type BookListQuery = z.infer<typeof bookListQuerySchema>;
export type BookSort = (typeof BOOK_SORTS)[number];
