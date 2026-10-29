'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FormField } from '@/components/ui/FormField';
import { ResultMark } from '@/components/ui/ResultMark';
import { applyServerErrors, errorMessage } from '@/lib/form';
import { ApiError } from '@/lib/http';
import { useResetPassword, useVerifyResetToken } from '../hooks/useAuth';
import { resetPasswordFormSchema, type ResetPasswordFormValues } from '../schemas/auth.schema';
import { AuthGlyph, AuthShell } from './AuthShell';
import styles from './AuthForm.module.css';
import { PasswordStrength } from '@/components/ui/PasswordStrength';

const INVALID_MESSAGE = 'Đường dẫn đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.';
/** Xem dấu ✓ + tia sáng bấy nhiêu ms rồi mới sang trang đăng nhập */
const DONE_DELAY_MS = 1100;

function InvalidToken() {
  return (
    <AuthShell
      icon={<ResultMark tone="fail" />}
      quote="Chìa khoá cũ đã không còn mở được cửa."
      title={
        <>
          Đường dẫn <em>hết hạn</em>
        </>
      }
      description={INVALID_MESSAGE}
    >
      <div className={styles.actions}>
        <Link href="/quen-mat-khau" className="btn btn-gold">
          <span>Gửi lại yêu cầu</span>
        </Link>
      </div>
    </AuthShell>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const verify = useVerifyResetToken(token);
  const resetPassword = useResetPassword();
  const [done, setDone] = useState(false);
  const { control, handleSubmit, setError } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });
  const [newPassword, confirmPassword] = useWatch({
    control,
    name: ['newPassword', 'confirmPassword'],
  });

  if (!token || verify.isError) return <InvalidToken />;

  if (verify.isPending) {
    return (
      <AuthShell
        icon={<ResultMark tone="wait" />}
        quote="Chờ một chút, ổ khoá đang được kiểm tra."
        title={
          <>
            Đặt lại <em>mật khẩu</em>
          </>
        }
      >
        <div className={styles.wait} role="status">
          <span>Đang kiểm tra đường dẫn...</span>
        </div>
      </AuthShell>
    );
  }

  const onSubmit = handleSubmit(({ newPassword }) =>
    resetPassword.mutate(
      { token, newPassword },
      {
        onSuccess: () => {
          enqueueSnackbar('Đặt lại mật khẩu thành công, vui lòng đăng nhập lại', {
            variant: 'success',
          });
          setDone(true);
          window.setTimeout(() => router.replace('/dang-nhap'), DONE_DELAY_MS);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'INVALID_RESET_TOKEN') {
            verify.refetch();
            return;
          }
          if (!applyServerErrors(error, setError, ['newPassword'])) {
            enqueueSnackbar(errorMessage(error), { variant: 'error' });
          }
        },
      },
    ),
  );

  return (
    <AuthShell
      icon={done ? <ResultMark tone="ok" /> : <AuthGlyph kind="lock" />}
      quote="Một chìa khoá mới cho cánh cửa của bạn."
      title={
        done ? (
          <>
            Đã đặt lại <em>mật khẩu</em>
          </>
        ) : (
          <>
            Đặt lại <em>mật khẩu</em>
          </>
        )
      }
      description={
        done ? 'Đang chuyển tới trang đăng nhập...' : 'Nhập mật khẩu mới cho tài khoản của bạn'
      }
    >
      {!done && (
        <form onSubmit={onSubmit} noValidate className={styles.form}>
          <FormField
            control={control}
            name="newPassword"
            label="Mật khẩu mới"
            type="password"
            autoComplete="new-password"
            autoFocus
          />
          <PasswordStrength value={newPassword} />
          <FormField
            control={control}
            name="confirmPassword"
            label="Nhập lại mật khẩu mới"
            type="password"
            autoComplete="new-password"
            hint={
              confirmPassword && confirmPassword === newPassword ? '✓ Mật khẩu khớp' : undefined
            }
          />
          <button
            type="submit"
            className="btn btn-gold"
            disabled={resetPassword.isPending}
            aria-busy={resetPassword.isPending}
          >
            <span>Xác nhận</span>
          </button>
        </form>
      )}
    </AuthShell>
  );
}
