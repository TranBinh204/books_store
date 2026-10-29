import { z } from 'zod';

// Quy tắc giống server (docs/03-modules/01-auth.md mục 7) — client chỉ để báo lỗi sớm

const email = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập email')
  .max(255, 'Email tối đa 255 ký tự')
  .pipe(z.email('Email không đúng định dạng'));

const password = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu phải có ít nhất 1 chữ cái')
  .regex(/\d/, 'Mật khẩu phải có ít nhất 1 chữ số');

export const loginFormSchema = z.object({
  email,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  rememberMe: z.boolean(),
});

export const registerFormSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Họ và tên tối thiểu 2 ký tự')
      .max(100, 'Họ và tên tối đa 100 ký tự'),
    phone: z
      .string()
      .trim()
      .regex(/^0\d{9}$/, 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0'),
    email,
    password,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });

export const registerOtpFormSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Mã xác minh gồm 6 chữ số'),
});

export const forgotPasswordFormSchema = z.object({ email });

export const resetPasswordFormSchema = z
  .object({
    newPassword: password,
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  });

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type RegisterOtpFormValues = z.infer<typeof registerOtpFormSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
