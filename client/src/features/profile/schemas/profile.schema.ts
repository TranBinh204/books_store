import { z } from 'zod';

// Quy tắc giống server (src/schemas/profile.schema.ts, address.schema.ts) — client chỉ để báo lỗi sớm

const fullName = z
  .string()
  .trim()
  .min(2, 'Họ và tên tối thiểu 2 ký tự')
  .max(100, 'Họ và tên tối đa 100 ký tự');

const phone = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0');

const password = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất 1 chữ cái')
  .regex(/\d/, 'Mật khẩu phải có ít nhất 1 chữ số');

export const profileFormSchema = z.object({
  fullName,
  phone,
  /** yyyy-mm-dd hoặc null (bỏ trống) — kiểm tra khoảng ngày ở DatePicker */
  birthday: z.string().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).nullable(),
});

export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  });

export const addressFormSchema = z.object({
  recipientName: fullName,
  phone,
  provinceCode: z
    .number({ error: 'Vui lòng chọn tỉnh / thành phố' })
    .nullable()
    .refine((value) => value !== null, 'Vui lòng chọn tỉnh / thành phố'),
  wardCode: z
    .number()
    .nullable()
    .refine((value) => value !== null, 'Vui lòng chọn phường / xã'),
  detail: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập địa chỉ chi tiết')
    .max(255, 'Địa chỉ chi tiết tối đa 255 ký tự'),
  isDefault: z.boolean(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
export type AddressFormValues = z.input<typeof addressFormSchema>;
