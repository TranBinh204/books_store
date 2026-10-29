'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CheckField } from '@/components/ui/CheckField';
import { FormField } from '@/components/ui/FormField';
import { errorMessage } from '@/lib/form';
import { useLogin } from '../hooks/useAuth';
import { useRedirectIfAuthenticated } from '../hooks/useRedirectIfAuthenticated';
import { loginFormSchema, type LoginFormValues } from '../schemas/auth.schema';
import { afterLoginPath } from '../utils/redirect';
import { AuthGlyph, AuthShell } from './AuthShell';
import styles from './AuthForm.module.css';

export function LoginForm() {
  const router = useRouter();
  /** Trang muốn quay lại sau khi đăng nhập (chỉ nhận đường dẫn trong danh sách cho phép) */
  const next = useSearchParams().get('next');
  const { enqueueSnackbar } = useSnackbar();
  useRedirectIfAuthenticated();
  const login = useLogin();
  // Số lần đăng nhập sai → thẻ rung + dòng lỗi dưới nút
  const [failures, setFailures] = useState(0);
  const [failMessage, setFailMessage] = useState('');
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = handleSubmit((values) =>
    login.mutate(values, {
      onSuccess: (user) => {
        enqueueSnackbar(`Xin chào, ${user.fullName}!`, { variant: 'success' });
        router.replace(afterLoginPath(user.role, next));
      },
      onError: (error) => {
        const message = errorMessage(error);
        enqueueSnackbar(message, { variant: 'error' });
        setFailMessage(message);
        setFailures((count) => count + 1);
      },
    }),
  );

  return (
    <AuthShell
      icon={<AuthGlyph kind="key" />}
      quote="Mỗi cuốn sách là một cánh cửa."
      title={
        <>
          Chào mừng <em>trở lại</em>
        </>
      }
      description="Đăng nhập để tiếp tục hành trình"
      shake={failures}
      footer={
        <>
          Bạn chưa có tài khoản? <Link href="/dang-ky">Đăng ký tại đây</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <FormField
          control={control}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
        />
        <FormField
          control={control}
          name="password"
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
        />
        <div className={styles.aside}>
          <Controller
            control={control}
            name="rememberMe"
            render={({ field }) => (
              <CheckField checked={field.value} onChange={field.onChange}>
                Ghi nhớ đăng nhập
              </CheckField>
            )}
          />
          <Link href="/quen-mat-khau" className="more">
            Quên mật khẩu?
          </Link>
        </div>
        <button
          type="submit"
          className="btn btn-gold"
          disabled={login.isPending}
          aria-busy={login.isPending}
        >
          <span>Đăng nhập</span>
        </button>
        {failMessage && !login.isPending && (
          <p className={styles.fail} role="alert">
            {failMessage}
          </p>
        )}
      </form>
    </AuthShell>
  );
}
