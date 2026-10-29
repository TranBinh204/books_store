'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { useForm } from 'react-hook-form';
import { FormField } from '@/components/ui/FormField';
import { ResultMark } from '@/components/ui/ResultMark';
import { errorMessage } from '@/lib/form';
import { useForgotPassword } from '../hooks/useAuth';
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from '../schemas/auth.schema';
import { AuthGlyph, AuthShell } from './AuthShell';
import styles from './AuthForm.module.css';

export function ForgotPasswordForm() {
  const { enqueueSnackbar } = useSnackbar();
  const forgotPassword = useForgotPassword();
  const { control, handleSubmit } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(({ email }) =>
    forgotPassword.mutate(email, {
      onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
    }),
  );

  const backToLogin = <Link href="/dang-nhap">Quay lại đăng nhập</Link>;
  const sent = forgotPassword.isSuccess;

  return (
    <AuthShell
      icon={sent ? <ResultMark tone="mail" /> : <AuthGlyph kind="mail" />}
      quote="Đừng lo, ai cũng có lúc quên chìa khoá."
      title={
        sent ? (
          <>
            Đã gửi <em>thư</em>
          </>
        ) : (
          <>
            Khôi phục <em>mật khẩu</em>
          </>
        )
      }
      description={
        sent ? undefined : 'Nhập email đã đăng ký, chúng tôi sẽ gửi đường dẫn đặt lại mật khẩu'
      }
      footer={backToLogin}
    >
      {sent ? (
        <div className={styles.sent} role="status">
          <p>{forgotPassword.data.message}.</p>
          <p>Vui lòng kiểm tra hộp thư (kể cả mục Spam). Đường dẫn có hiệu lực trong 15 phút.</p>
          <button type="button" className="btn btn-ghost" onClick={() => forgotPassword.reset()}>
            <span>Gửi lại cho email khác</span>
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className={styles.form}>
          <FormField
            control={control}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-gold"
            disabled={forgotPassword.isPending}
            aria-busy={forgotPassword.isPending}
          >
            <span>Gửi yêu cầu</span>
          </button>
          {forgotPassword.isError && (
            <p className={styles.fail} role="alert">
              {errorMessage(forgotPassword.error)}
            </p>
          )}
        </form>
      )}
    </AuthShell>
  );
}
