'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FormField } from '@/components/ui/FormField';
import { applyServerErrors, errorMessage } from '@/lib/form';
import { useRegister } from '../hooks/useAuth';
import { useRedirectIfAuthenticated } from '../hooks/useRedirectIfAuthenticated';
import { registerFormSchema, type RegisterFormValues } from '../schemas/auth.schema';
import type { RegisterOtpSent } from '../types/auth.types';
import { AuthGlyph, AuthShell } from './AuthShell';
import styles from './AuthForm.module.css';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { RegisterOtpStep } from './RegisterOtpStep';

const SERVER_FIELDS = ['fullName', 'phone', 'email', 'password'] as const;

/** Đăng ký 2 bước: điền thông tin → nhập mã OTP gửi qua email (RegisterOtpStep) */
export function RegisterForm() {
  const { enqueueSnackbar } = useSnackbar();
  // Đã gửi mã OTP → hiện bước nhập mã (form giữ nguyên giá trị khi quay lại)
  const [otpSent, setOtpSent] = useState<RegisterOtpSent | null>(null);
  useRedirectIfAuthenticated();
  const registerMutation = useRegister();
  const { control, handleSubmit, setError } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { fullName: '', phone: '', email: '', password: '', confirmPassword: '' },
  });
  const [password, confirmPassword] = useWatch({ control, name: ['password', 'confirmPassword'] });

  const onSubmit = handleSubmit(({ fullName, phone, email, password }) =>
    registerMutation.mutate(
      { fullName, phone, email, password },
      {
        onSuccess: (sent) => setOtpSent(sent),
        onError: (error) => {
          // Email / SĐT trùng → hiện ngay dưới ô nhập
          if (!applyServerErrors(error, setError, SERVER_FIELDS)) {
            enqueueSnackbar(errorMessage(error), { variant: 'error' });
          }
        },
      },
    ),
  );

  if (otpSent) {
    return <RegisterOtpStep sent={otpSent} onBack={() => setOtpSent(null)} />;
  }

  return (
    <AuthShell
      icon={<AuthGlyph kind="book" />}
      quote="Trang đầu tiên của bạn bắt đầu từ đây."
      title={
        <>
          Mở <em>cánh cửa</em> mới
        </>
      }
      description="Tạo tài khoản để lưu giỏ hàng, đơn và sách yêu thích"
      footer={
        <>
          Bạn đã có tài khoản? <Link href="/dang-nhap">Đăng nhập ngay</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <div className={styles.pair}>
          <FormField
            control={control}
            name="fullName"
            label="Họ và tên"
            autoComplete="name"
            autoFocus
          />
          <FormField
            control={control}
            name="phone"
            label="Số điện thoại"
            type="tel"
            autoComplete="tel"
          />
        </div>
        <FormField control={control} name="email" label="Email" type="email" autoComplete="email" />
        <FormField
          control={control}
          name="password"
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
        />
        <PasswordStrength value={password} />
        <FormField
          control={control}
          name="confirmPassword"
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          hint={confirmPassword && confirmPassword === password ? '✓ Mật khẩu khớp' : undefined}
        />
        <button
          type="submit"
          className="btn btn-gold"
          disabled={registerMutation.isPending}
          aria-busy={registerMutation.isPending}
        >
          <span>Đăng ký</span>
        </button>
      </form>
    </AuthShell>
  );
}
