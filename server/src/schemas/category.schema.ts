import { z } from 'zod';
import { idSchema, nameSchema } from './common.schema';

/** Khóa icon danh mục — khớp CHECK của migration 023 và icon vẽ sẵn ở client (components/fx/SvgDefs) */
export const CATEGORY_ICON_KEYS = [
  'ky-nang',
  'tam-ly',
  'van-hoc',
  'thieu-nhi',
  'ngon-tinh',
  'on-thi',
  'fantasy',
  'manga',
  'gia-dinh',
] as const;
export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

/** null = icon sách mặc định */
const iconKeySchema = z.enum(CATEGORY_ICON_KEYS, { error: 'Icon không hợp lệ' }).nullable();

/** Mô tả ngắn hiện ở đầu trang danh mục; chuỗi rỗng = xoá mô tả (null) */
const descriptionSchema = z
  .string()
  .trim()
  .max(300, 'Mô tả tối đa 300 ký tự')
  .transform((value) => value.replace(/\s+/g, ' ') || null)
  .nullable();

export const createCategorySchema = z.object({
  name: nameSchema(100, 'tên danh mục'),
  parentId: idSchema.nullable().optional().default(null),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
  iconKey: iconKeySchema.optional().default(null),
  description: descriptionSchema.optional().default(null),
});

export const updateCategorySchema = z
  .object({
    name: nameSchema(100, 'tên danh mục'),
    parentId: idSchema.nullable(),
    sortOrder: z.number().int().min(0).max(9999),
    isActive: z.boolean(),
    iconKey: iconKeySchema,
    description: descriptionSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Không có thông tin nào để cập nhật');

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
