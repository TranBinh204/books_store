import { z } from 'zod';

/** Email: bỏ khoảng trắng, chuyển chữ thường */
export const emailSchema = z
  .string({ error: 'Vui lòng nhập email' })
  .trim()
  .toLowerCase()
  .max(255, 'Email tối đa 255 ký tự')
  .pipe(z.email('Email không đúng định dạng'));

/** Mật khẩu: 8–72 ký tự (72 là giới hạn của bcrypt), có chữ cái và chữ số */
export const passwordSchema = z
  .string({ error: 'Vui lòng nhập mật khẩu' })
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất 1 chữ cái')
  .regex(/\d/, 'Mật khẩu phải có ít nhất 1 chữ số');

/** Số di động Việt Nam: 10 số, bắt đầu bằng 0 */
export const phoneSchema = z
  .string({ error: 'Vui lòng nhập số điện thoại' })
  .trim()
  .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0');

/** Họ tên: gộp khoảng trắng thừa */
export const fullNameSchema = z
  .string({ error: 'Vui lòng nhập họ và tên' })
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(z.string().min(2, 'Họ và tên tối thiểu 2 ký tự').max(100, 'Họ và tên tối đa 100 ký tự'));

/** id: số nguyên dương */
export const idSchema = z.coerce.number().int().positive('id không hợp lệ');

/** id trên URL */
export const idParamSchema = z.object({ id: idSchema });

/** ?page=&limit= — mặc định trang 1, 20 dòng, tối đa 100 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/** Từ khoá tìm kiếm: bỏ khoảng trắng thừa, rỗng → undefined */
export const keywordSchema = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value || undefined);

/** Tên ngắn (danh mục, tác giả, NXB): bỏ khoảng trắng thừa */
export function nameSchema(max: number, label: string) {
  return z
    .string({ error: `Vui lòng nhập ${label}` })
    .trim()
    .transform((value) => value.replace(/\s+/g, ' '))
    .pipe(z.string().min(1, `Vui lòng nhập ${label}`).max(max, `${label} tối đa ${max} ký tự`));
}
