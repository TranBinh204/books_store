import { z } from 'zod';
import { fullNameSchema, passwordSchema, phoneSchema } from './common.schema';

// Thông tin cá nhân & đổi mật khẩu — docs/03-modules/04-user-profile.md

/** Tuổi tối đa hợp lý khi nhập ngày sinh */
const MAX_AGE_YEARS = 120;

/** yyyy-mm-dd, không ở tương lai, tuổi ≤ MAX_AGE_YEARS; `null` = xoá */
const birthdaySchema = z.iso
  .date('Ngày sinh không hợp lệ')
  .refine((value) => value <= new Date().toISOString().slice(0, 10), 'Ngày sinh không hợp lệ')
  .refine((value) => {
    const oldest = new Date();
    oldest.setFullYear(oldest.getFullYear() - MAX_AGE_YEARS);
    return value >= oldest.toISOString().slice(0, 10);
  }, 'Ngày sinh không hợp lệ')
  .nullable();

/** Gửi trường nào sửa trường đó; email & vai trò không sửa được */
export const updateProfileSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    phone: phoneSchema.optional(),
    birthday: birthdaySchema.optional(),
    gender: z
      .enum(['MALE', 'FEMALE', 'OTHER'], { error: 'Giới tính không hợp lệ' })
      .nullable()
      .optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    message: 'Không có gì để cập nhật',
  });

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: 'Vui lòng nhập mật khẩu hiện tại' })
    .min(1, 'Vui lòng nhập mật khẩu hiện tại')
    .max(72),
  newPassword: passwordSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
