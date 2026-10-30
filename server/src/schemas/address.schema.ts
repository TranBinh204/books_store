import { z } from 'zod';
import { fullNameSchema, phoneSchema } from './common.schema';

// Sổ địa chỉ — docs/03-modules/04-user-profile.md

/** Số địa chỉ tối đa mỗi tài khoản */
export const ADDRESS_LIMIT = 10;

const codeSchema = (label: string) =>
  z
    .number({ error: `Vui lòng chọn ${label}` })
    .int(`${label} không hợp lệ`)
    .positive(`${label} không hợp lệ`);

const placeNameSchema = (label: string) =>
  z
    .string({ error: `Vui lòng chọn ${label}` })
    .trim()
    .min(1, `Vui lòng chọn ${label}`)
    .max(100, `${label} không hợp lệ`);

export const addressSchema = z.object({
  recipientName: fullNameSchema,
  phone: phoneSchema,
  provinceCode: codeSchema('tỉnh / thành phố'),
  province: placeNameSchema('tỉnh / thành phố'),
  wardCode: codeSchema('phường / xã'),
  ward: placeNameSchema('phường / xã'),
  detail: z
    .string({ error: 'Vui lòng nhập địa chỉ chi tiết' })
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(
      z
        .string()
        .min(1, 'Vui lòng nhập địa chỉ chi tiết')
        .max(255, 'Địa chỉ chi tiết tối đa 255 ký tự'),
    ),
  isDefault: z.boolean().optional().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
