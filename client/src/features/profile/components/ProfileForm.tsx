'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { Controller, useForm } from 'react-hook-form';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { FormField, ReadOnlyField } from '@/components/ui/FormField';
import { IconLock } from '@/components/ui/icons';
import { applyServerErrors, errorMessage } from '@/lib/form';
import { useProfile, useProfileOverview, useUpdateProfile } from '../hooks/useProfile';
import { profileFormSchema, type ProfileFormValues } from '../schemas/profile.schema';
import type { Gender, Profile } from '../types';
import { AccountPanel } from './AccountShell';
import styles from './AccountForm.module.css';
import { UserAvatar } from './UserAvatar';

const GENDERS = [
  { value: 'MALE', label: 'Nam' },
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'OTHER', label: 'Khác' },
] as const satisfies readonly { value: Gender; label: string }[];

const SERVER_FIELDS = ['fullName', 'phone', 'birthday', 'gender'] as const;
/** Ngày sinh hợp lệ: trong vòng 120 năm tới hôm nay (khớp server) */
const MAX_AGE_YEARS = 120;
const DATE_FORMAT = 'YYYY-MM-DD';

const toFormValues = (profile: Profile): ProfileFormValues => ({
  fullName: profile.fullName,
  phone: profile.phone ?? '',
  birthday: profile.birthday,
  gender: profile.gender,
});

function ProfileFormBody({ profile }: { profile: Profile }) {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdateProfile();
  const {
    control,
    handleSubmit,
    setError,
    reset,
    formState: { isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: toFormValues(profile),
  });

  const onSubmit = handleSubmit((values) =>
    // Ô ngày xoá trống trả về chuỗi rỗng → gửi null
    update.mutate(
      { ...values, birthday: values.birthday || null },
      {
        onSuccess: (saved) => {
          reset(toFormValues(saved));
          enqueueSnackbar('Đã lưu thông tin tài khoản', { variant: 'success' });
        },
        onError: (error) => {
          if (!applyServerErrors(error, setError, SERVER_FIELDS)) {
            enqueueSnackbar(errorMessage(error), { variant: 'error' });
          }
        },
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form}>
      <div className={styles.pair}>
        <FormField control={control} name="fullName" label="Họ và tên" autoComplete="name" />
        <FormField
          control={control}
          name="phone"
          label="Số điện thoại"
          type="tel"
          autoComplete="tel"
        />
      </div>
      <ReadOnlyField
        label="Email"
        value={profile.email}
        hint="Email dùng để đăng nhập, không thể thay đổi"
        adornment={<IconLock width="18" height="18" />}
      />
      <FormField
        control={control}
        name="birthday"
        label="Ngày sinh"
        type="date"
        min={dayjs().subtract(MAX_AGE_YEARS, 'year').format(DATE_FORMAT)}
        max={dayjs().format(DATE_FORMAT)}
      />
      <Controller
        control={control}
        name="gender"
        render={({ field }) => (
          <ChoiceChips
            label="Giới tính"
            options={GENDERS}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <div className={styles.bar}>
        <button
          type="submit"
          className="btn btn-gold"
          disabled={!isDirty || update.isPending}
          aria-busy={update.isPending}
        >
          <span>Lưu thay đổi</span>
        </button>
        {isDirty && !update.isPending && (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => reset(toFormValues(profile))}
            >
              <span>Hoàn tác</span>
            </button>
            <span className={styles.dirty} role="status">
              ✦ Có thay đổi chưa lưu
            </span>
          </>
        )}
      </div>
    </form>
  );
}

const memberSince = (value: string) => dayjs(value).format('DD/MM/YYYY');

/** Thẻ danh tính: avatar vòng vàng, tên, email, ngày tham gia + số đơn / số sách yêu thích */
function IdentityCard({ profile }: { profile: Profile }) {
  const overview = useProfileOverview();
  return (
    <div className={styles.identity}>
      <UserAvatar fullName={profile.fullName} size={88} ring />
      <div className={styles.who}>
        <strong title={profile.fullName}>{profile.fullName}</strong>
        <span className={styles.email}>{profile.email}</span>
        <span className={styles.since}>✦ Thành viên từ {memberSince(profile.createdAt)}</span>
      </div>
      {profile.role === 'CUSTOMER' && (
        <dl className={styles.stats}>
          <Link href="/tai-khoan/don-hang">
            <dd>{overview.data?.orderCount ?? '–'}</dd>
            <dt>Đơn hàng</dt>
          </Link>
          <Link href="/tai-khoan/yeu-thich">
            <dd>{overview.data?.wishlistCount ?? '–'}</dd>
            <dt>Yêu thích</dt>
          </Link>
        </dl>
      )}
    </div>
  );
}

/** Trang /tai-khoan — thông tin cá nhân (F08) */
export function ProfileForm() {
  const profile = useProfile();

  return (
    <AccountPanel
      chapter="Hồ sơ"
      title={
        <>
          Thông tin <em>của bạn</em>
        </>
      }
      description="Quản lý thông tin cá nhân của bạn"
    >
      {profile.isPending ? (
        <div className={styles.form} aria-busy="true">
          <div className={`o-skel ${styles.skelHead}`} />
          {[0, 1, 2].map((index) => (
            <div key={index} className={`o-skel ${styles.skelRow}`} />
          ))}
        </div>
      ) : profile.isError ? (
        <div className={styles.failBox}>
          <p className={styles.fail} role="alert">
            {errorMessage(profile.error)}
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => profile.refetch()}>
            <span>Thử lại</span>
          </button>
        </div>
      ) : (
        <>
          <IdentityCard profile={profile.data} />
          <ProfileFormBody profile={profile.data} />
        </>
      )}
    </AccountPanel>
  );
}
