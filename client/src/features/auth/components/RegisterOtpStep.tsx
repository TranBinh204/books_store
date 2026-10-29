'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState, useSyncExternalStore } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { OtpInput } from '@/components/ui/OtpInput';
import { ResultMark } from '@/components/ui/ResultMark';
import { ApiError } from '@/lib/http';
import { applyServerErrors, errorMessage } from '@/lib/form';
import { useResendRegisterOtp, useVerifyRegister } from '../hooks/useAuth';
import { registerOtpFormSchema, type RegisterOtpFormValues } from '../schemas/auth.schema';
import type { RegisterOtpSent } from '../types/auth.types';
import { AuthGlyph, AuthShell } from './AuthShell';
import styles from './AuthForm.module.css';

/** Lỗi khiến yêu cầu đăng ký bị huỷ → phải quay lại form đăng ký */
const RESTART_CODES = [
  'REGISTRATION_NOT_FOUND',
  'OTP_TOO_MANY_ATTEMPTS',
  'EMAIL_EXISTS',
  'PHONE_EXISTS',
];
/** Xem dấu ✓ + tia sáng bấy nhiêu ms rồi mới sang trang đăng nhập */
const DONE_DELAY_MS = 1100;

/** Đồng hồ nhảy mỗi giây (giống Countdown của flash sale) */
function subscribe(onTick: () => void) {
  const timer = window.setInterval(onTick, 1000);
  return () => window.clearInterval(timer);
}
const getNow = () => Math.floor(Date.now() / 1000) * 1000;

/** Số giây còn lại tới `until` */
function useSecondsLeft(until: number) {
  const now = useSyncExternalStore(subscribe, getNow, getNow);
  return Math.max(0, Math.ceil((until - now) / 1000));
}

interface RegisterOtpStepProps {
  sent: RegisterOtpSent;
  /** Quay lại form đăng ký (đổi email / đăng ký lại) */
  onBack: () => void;
}

/** Đăng ký bước 2: nhập mã OTP 6 số gửi qua email → tạo tài khoản → sang trang đăng nhập */
export function RegisterOtpStep({ sent, onBack }: RegisterOtpStepProps) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const verify = useVerifyRegister();
  const resend = useResendRegisterOtp();
  const [expiresInMinutes, setExpiresInMinutes] = useState(sent.expiresInMinutes);
  const [resendAt, setResendAt] = useState(() => Date.now() + sent.resendAfterSeconds * 1000);
  const resendLeft = useSecondsLeft(resendAt);
  const [done, setDone] = useState(false);
  const [failures, setFailures] = useState(0);

  const { control, handleSubmit, setError, reset } = useForm<RegisterOtpFormValues>({
    resolver: zodResolver(registerOtpFormSchema),
    defaultValues: { otp: '' },
  });

  const onSubmit = handleSubmit(({ otp }) =>
    verify.mutate(
      { email: sent.email, otp },
      {
        onSuccess: () => {
          enqueueSnackbar('Xác minh email thành công, vui lòng đăng nhập', { variant: 'success' });
          setDone(true);
          window.setTimeout(() => router.replace('/dang-nhap'), DONE_DELAY_MS);
        },
        onError: (error) => {
          if (error instanceof ApiError && RESTART_CODES.includes(error.code)) {
            enqueueSnackbar(error.message, { variant: 'error' });
            onBack();
            return;
          }
          setFailures((count) => count + 1);
          if (error instanceof ApiError && error.code === 'OTP_EXPIRED') {
            setError('otp', { type: 'server', message: error.message });
            return;
          }
          // Mã sai → hiện ngay dưới ô nhập (kèm số lần còn lại)
          if (!applyServerErrors(error, setError, ['otp'])) {
            enqueueSnackbar(errorMessage(error), { variant: 'error' });
          }
        },
      },
    ),
  );

  const onResend = () =>
    resend.mutate(sent.email, {
      onSuccess: (data) => {
        setExpiresInMinutes(data.expiresInMinutes);
        setResendAt(Date.now() + data.resendAfterSeconds * 1000);
        reset({ otp: '' });
        enqueueSnackbar('Đã gửi mã xác minh mới, vui lòng kiểm tra email', { variant: 'success' });
      },
      onError: (error) => {
        enqueueSnackbar(errorMessage(error), { variant: 'error' });
        if (error instanceof ApiError && error.code === 'REGISTRATION_NOT_FOUND') onBack();
      },
    });

  return (
    <AuthShell
      icon={done ? <ResultMark tone="ok" /> : <AuthGlyph kind="mail" />}
      quote="Một mã nhỏ, mở cả thư viện."
      title={
        done ? (
          <>
            Xác minh <em>thành công</em>
          </>
        ) : (
          <>
            Xác minh <em>email</em>
          </>
        )
      }
      description={
        done ? (
          'Đang chuyển tới trang đăng nhập...'
        ) : (
          <>
            Mã gồm 6 chữ số đã gửi tới <strong className={styles.email}>{sent.email}</strong>. Mã có
            hiệu lực {expiresInMinutes} phút (kiểm tra cả mục Spam).
          </>
        )
      }
      shake={failures}
      footer={
        done ? undefined : (
          <>
            Nhập sai email?{' '}
            <button type="button" onClick={onBack}>
              Quay lại đăng ký
            </button>
          </>
        )
      }
    >
      {!done && (
        <form onSubmit={onSubmit} noValidate className={styles.form}>
          <Controller
            control={control}
            name="otp"
            render={({ field, fieldState }) => (
              <OtpInput
                value={field.value}
                onChange={field.onChange}
                label="Mã xác minh"
                error={fieldState.error?.message}
                autoFocus
              />
            )}
          />
          <button
            type="submit"
            className="btn btn-gold"
            disabled={verify.isPending}
            aria-busy={verify.isPending}
          >
            <span>Xác minh</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onResend}
            disabled={resendLeft > 0 || resend.isPending}
            aria-busy={resend.isPending}
          >
            <span>{resendLeft > 0 ? `Gửi lại mã sau ${resendLeft} giây` : 'Gửi lại mã'}</span>
          </button>
        </form>
      )}
    </AuthShell>
  );
}
