'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { FormField } from '@/components/ui/FormField';
import { IconLock } from '@/components/ui/icons';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { ResultMark } from '@/components/ui/ResultMark';
import { applyServerErrors, errorMessage } from '@/lib/form';
import { useChangePassword } from '../hooks/useProfile';
import { changePasswordFormSchema, type ChangePasswordFormValues } from '../schemas/profile.schema';
import { AccountPanel } from './AccountShell';
import styles from './AccountForm.module.css';

const SERVER_FIELDS = ['currentPassword', 'newPassword'] as const;
const EMPTY: ChangePasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const TIPS = [
  'Không chia sẻ mật khẩu cho bất kỳ ai',
  'Dùng mật khẩu riêng cho từng nơi',
  'Đổi ngay khi nghi ngờ bị lộ',
];

/** Trang /tai-khoan/doi-mat-khau (F08) — giữ đăng nhập thiết bị này, đăng xuất thiết bị khác */
export function ChangePasswordForm() {
  const { enqueueSnackbar } = useSnackbar();
  const changePassword = useChangePassword();
  /** Đổi xong → hiện khối ✓ thay biểu mẫu */
  const [done, setDone] = useState(false);
  /** Mỗi lần sai +1; chẵn / lẻ chọn tên animation để rung chạy lại được */
  const [failures, setFailures] = useState(0);
  const { control, handleSubmit, setError, setFocus, reset } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: EMPTY,
  });
  const newPassword = useWatch({ control, name: 'newPassword' });
  const confirmPassword = useWatch({ control, name: 'confirmPassword' });

  const onSubmit = handleSubmit(({ currentPassword, newPassword }) =>
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          reset(EMPTY);
          setDone(true);
        },
        onError: (error) => {
          setFailures((count) => count + 1);
          if (applyServerErrors(error, setError, SERVER_FIELDS)) {
            setFocus('currentPassword');
          } else {
            enqueueSnackbar(errorMessage(error), { variant: 'error' });
          }
        },
      },
    ),
  );

  return (
    <AccountPanel
      chapter="Bảo mật"
      title={
        <>
          Đổi <em>mật khẩu</em>
        </>
      }
      description="Để bảo mật tài khoản, không chia sẻ mật khẩu cho người khác"
    >
      <div className={styles.security}>
        {done ? (
          <div className={styles.done} role="status">
            <ResultMark tone="ok" />
            <h2>
              Mật khẩu đã <em>được đổi</em>
            </h2>
            <p>Các thiết bị khác đã được đăng xuất.</p>
            <div className={styles.doneActions}>
              <button type="button" className="btn btn-ghost" onClick={() => setDone(false)}>
                <span>Đổi lần nữa</span>
              </button>
              <Link href="/tai-khoan/thiet-bi" className="more">
                Xem thiết bị đăng nhập
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            className={styles.form}
            data-shake={failures === 0 ? undefined : failures % 2 ? 'a' : 'b'}
          >
            <FormField
              control={control}
              name="currentPassword"
              label="Mật khẩu hiện tại"
              type="password"
              autoComplete="current-password"
              autoFocus
            />
            <FormField
              control={control}
              name="newPassword"
              label="Mật khẩu mới"
              type="password"
              autoComplete="new-password"
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
            <div className={styles.bar}>
              <button
                type="submit"
                className="btn btn-gold"
                disabled={changePassword.isPending}
                aria-busy={changePassword.isPending}
              >
                <span>Đổi mật khẩu</span>
              </button>
            </div>
          </form>
        )}

        <aside className={`panel ${styles.shield}`}>
          <IconLock width="40" height="40" className={styles.shieldIcon} />
          <ul>
            {TIPS.map((tip) => (
              <li key={tip}>
                <span aria-hidden="true">✦</span> {tip}
              </li>
            ))}
          </ul>
          <p>
            Sau khi đổi, bạn vẫn đăng nhập trên thiết bị này; các thiết bị khác sẽ phải đăng nhập
            lại.
          </p>
          <Link href="/tai-khoan/thiet-bi" className="more">
            Xem thiết bị đăng nhập
          </Link>
        </aside>
      </div>
    </AccountPanel>
  );
}
