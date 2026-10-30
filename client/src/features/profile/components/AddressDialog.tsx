'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useSnackbar } from 'notistack';
import { Controller, useForm } from 'react-hook-form';
import { CheckField } from '@/components/ui/CheckField';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { useCurrentUser } from '@/features/auth';
import { applyServerErrors, errorMessage } from '@/lib/form';
import { useProvinces, useSaveAddress } from '../hooks/useProfile';
import { addressFormSchema, type AddressFormValues } from '../schemas/profile.schema';
import type { Address } from '../types';
import styles from './AddressDialog.module.css';
import { LocationFields } from './LocationFields';

const SERVER_FIELDS = ['recipientName', 'phone', 'provinceCode', 'wardCode', 'detail'] as const;

interface AddressDialogProps {
  open: boolean;
  /** Có → sửa; không → thêm mới */
  address: Address | null;
  /** Thêm địa chỉ đầu tiên → luôn là mặc định */
  isFirst: boolean;
  onClose: () => void;
}

const toFormValues = (address: Address | null, isFirst: boolean): AddressFormValues => ({
  recipientName: address?.recipientName ?? '',
  phone: address?.phone ?? '',
  provinceCode: address?.provinceCode ?? null,
  wardCode: address?.wardCode ?? null,
  detail: address?.detail ?? '',
  isDefault: address?.isDefault ?? isFirst,
});

/** Thêm / sửa địa chỉ. Mở cho địa chỉ khác → đặt `key` để làm mới form */
export function AddressDialog({ open, address, isFirst, onClose }: AddressDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: user } = useCurrentUser();
  const provinces = useProvinces();
  const save = useSaveAddress();
  const { control, handleSubmit, setError, setValue } = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: toFormValues(address, isFirst),
  });

  // Địa chỉ đầu tiên / đang là mặc định: luôn mặc định (bỏ tích không có tác dụng)
  const defaultLocked = isFirst || Boolean(address?.isDefault);

  const fillMyInfo = () => {
    if (!user) return;
    setValue('recipientName', user.fullName, { shouldDirty: true, shouldValidate: true });
    if (user.phone) setValue('phone', user.phone, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = handleSubmit((values) => {
    const province = provinces.data?.find((item) => item.code === values.provinceCode);
    const ward = province?.wards.find((item) => item.code === values.wardCode);
    if (!province || !ward) return;

    save.mutate(
      {
        id: address?.id,
        payload: {
          recipientName: values.recipientName,
          phone: values.phone,
          provinceCode: province.code,
          province: province.name,
          wardCode: ward.code,
          ward: ward.name,
          detail: values.detail,
          isDefault: values.isDefault,
        },
      },
      {
        onSuccess: () => {
          enqueueSnackbar(address ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới', {
            variant: 'success',
          });
          onClose();
        },
        onError: (error) => {
          if (!applyServerErrors(error, setError, SERVER_FIELDS)) {
            enqueueSnackbar(errorMessage(error), { variant: 'error' });
          }
        },
      },
    );
  });

  const defaultLabel = isFirst
    ? 'Đặt làm địa chỉ mặc định (địa chỉ đầu tiên luôn là mặc định)'
    : address?.isDefault
      ? 'Đang là địa chỉ mặc định'
      : 'Đặt làm địa chỉ mặc định';

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!save.isPending}
      chapter="✦ Sổ địa chỉ"
      title={
        address ? (
          <>
            Sửa <em>địa chỉ</em>
          </>
        ) : (
          <>
            Thêm địa chỉ <em>mới</em>
          </>
        )
      }
    >
      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <button
          type="button"
          className={`more ${styles.fill}`}
          onClick={fillMyInfo}
          disabled={!user}
        >
          Dùng thông tin của tôi
        </button>
        <div className={styles.pair}>
          <FormField
            control={control}
            name="recipientName"
            label="Họ tên người nhận"
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

        {provinces.isPending ? (
          <div className={styles.pair} aria-busy="true">
            <div className={`o-skel ${styles.skel}`} />
            <div className={`o-skel ${styles.skel}`} />
          </div>
        ) : provinces.isError ? (
          <p className={styles.fail} role="alert">
            {errorMessage(provinces.error)}
          </p>
        ) : (
          <LocationFields control={control} setValue={setValue} provinces={provinces.data} />
        )}

        <FormField
          control={control}
          name="detail"
          label="Địa chỉ chi tiết"
          autoComplete="street-address"
          hint="Số nhà, tên đường, toà nhà..."
        />

        <Controller
          control={control}
          name="isDefault"
          render={({ field }) => (
            <CheckField
              checked={defaultLocked || field.value}
              onChange={defaultLocked ? () => undefined : field.onChange}
            >
              {defaultLabel}
            </CheckField>
          )}
        />

        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={save.isPending}
          >
            <span>Huỷ</span>
          </button>
          <button
            type="submit"
            className="btn btn-gold"
            disabled={save.isPending || !provinces.data}
            aria-busy={save.isPending}
          >
            <span>{address ? 'Lưu địa chỉ' : 'Thêm địa chỉ'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
