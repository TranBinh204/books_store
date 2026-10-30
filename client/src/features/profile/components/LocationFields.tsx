'use client';

import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { ComboField } from '@/components/ui/ComboField';
import type { AddressFormValues } from '../schemas/profile.schema';
import type { Province } from '../types';
import styles from './AddressDialog.module.css';

interface LocationFieldsProps {
  control: Control<AddressFormValues>;
  setValue: UseFormSetValue<AddressFormValues>;
  provinces: Province[];
}

/** Tỉnh / thành phố → Phường / xã (địa giới 2 cấp từ 01/07/2025) */
export function LocationFields({ control, setValue, provinces }: LocationFieldsProps) {
  const provinceCode = useWatch({ control, name: 'provinceCode' });
  const wards = provinces.find((province) => province.code === provinceCode)?.wards ?? [];

  return (
    <div className={styles.pair}>
      <Controller
        control={control}
        name="provinceCode"
        render={({ field, fieldState }) => (
          <ComboField
            label="Tỉnh / Thành phố"
            options={provinces}
            value={field.value}
            onChange={(code) => {
              field.onChange(code);
              // Đổi tỉnh → phường cũ không còn đúng
              setValue('wardCode', null, { shouldDirty: true });
            }}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            emptyText="Không tìm thấy tỉnh / thành phố"
          />
        )}
      />
      <Controller
        control={control}
        name="wardCode"
        render={({ field, fieldState }) => (
          <ComboField
            label="Phường / Xã"
            options={wards}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            disabled={!provinceCode}
            error={fieldState.error?.message}
            hint={provinceCode ? undefined : 'Chọn tỉnh / thành trước'}
            emptyText="Không tìm thấy phường / xã"
          />
        )}
      />
    </div>
  );
}
