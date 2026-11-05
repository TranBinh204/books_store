'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Switch,
  useMediaQuery,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { useSnackbar } from 'notistack';
import { useEffect, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type Path } from 'react-hook-form';
import { z } from 'zod';
import { FormTextField } from '@/components/ui/FormTextField';
import { IconLock } from '@/components/ui/icons';
import { applyServerErrors, errorMessage } from '@/lib/form';
import { formatPrice } from '@/lib/format';
import { useSaveVoucher } from '../hooks/useAdminVouchers';
import type { AdminVoucher, VoucherPayload } from '../types';
import styles from './VoucherFormDialog.module.css';

// Các ô số để dạng chuỗi (được để trống), chuyển sang số khi gửi — như form sách
const digits = (label: string) => z.string().trim().regex(/^\d*$/, `${label} chỉ gồm chữ số`);
const dateTime = z.custom<Dayjs | null>();

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{4,30}$/, 'Mã gồm 4–30 ký tự, chỉ chữ cái không dấu và chữ số'),
    description: z.string().trim().max(255, 'Tối đa 255 ký tự'),
    discountType: z.enum(['PERCENT', 'FIXED']),
    discountValue: digits('Mức giảm').min(1, 'Vui lòng nhập mức giảm'),
    maxDiscount: digits('Giảm tối đa'),
    minOrderValue: digits('Đơn tối thiểu'),
    startAt: dateTime,
    endAt: dateTime,
    usageLimit: digits('Tổng lượt'),
    perUserLimit: digits('Lượt / người').min(1, 'Vui lòng nhập lượt / người'),
    isPublic: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const issue = (path: Path<FormValues>, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    const value = Number(values.discountValue);
    if (values.discountValue && value === 0) issue('discountValue', 'Mức giảm phải lớn hơn 0');
    if (values.discountType === 'PERCENT' && value > 100) {
      issue('discountValue', 'Giảm theo % tối đa 100%');
    }
    if (values.maxDiscount !== '' && Number(values.maxDiscount) === 0) {
      issue('maxDiscount', 'Để trống nếu không giới hạn');
    }
    if (values.usageLimit !== '' && Number(values.usageLimit) === 0) {
      issue('usageLimit', 'Để trống nếu không giới hạn');
    }
    if (values.perUserLimit && Number(values.perUserLimit) === 0) {
      issue('perUserLimit', 'Lượt / người phải lớn hơn 0');
    }
    if (!values.startAt?.isValid()) issue('startAt', 'Vui lòng chọn thời gian bắt đầu');
    if (!values.endAt?.isValid()) issue('endAt', 'Vui lòng chọn thời gian kết thúc');
    else if (values.startAt?.isValid() && !values.endAt.isAfter(values.startAt)) {
      issue('endAt', 'Thời gian kết thúc phải sau thời gian bắt đầu');
    }
  });
type FormValues = z.infer<typeof schema>;

/** Trường được sửa khi voucher đã có đơn dùng (M11 quy tắc 10) — còn lại bị khoá */
const EDITABLE_WHEN_USED = ['description', 'endAt', 'usageLimit', 'isPublic', 'isActive'] as const;

const SERVER_FIELDS: Path<FormValues>[] = [
  'code',
  'description',
  'discountValue',
  'maxDiscount',
  'minOrderValue',
  'startAt',
  'endAt',
  'usageLimit',
  'perUserLimit',
];

function emptyValues(): FormValues {
  const start = dayjs().startOf('minute');
  return {
    code: '',
    description: '',
    discountType: 'PERCENT',
    discountValue: '',
    maxDiscount: '',
    minOrderValue: '0',
    startAt: start,
    endAt: start.add(30, 'day').endOf('day').startOf('minute'),
    usageLimit: '',
    perUserLimit: '1',
    isPublic: true,
    isActive: true,
  };
}

function toValues(voucher: AdminVoucher): FormValues {
  return {
    code: voucher.code,
    description: voucher.description ?? '',
    discountType: voucher.discountType,
    discountValue: String(voucher.discountValue),
    maxDiscount: voucher.maxDiscount === null ? '' : String(voucher.maxDiscount),
    minOrderValue: String(voucher.minOrderValue),
    startAt: dayjs(voucher.startAt),
    endAt: dayjs(voucher.endAt),
    usageLimit: voucher.usageLimit === null ? '' : String(voucher.usageLimit),
    perUserLimit: String(voucher.perUserLimit),
    isPublic: voucher.isPublic,
    isActive: voucher.isActive,
  };
}

function toPayload(values: FormValues): VoucherPayload {
  const orNull = (value: string) => (value === '' ? null : Number(value));
  return {
    code: values.code.toUpperCase(),
    description: values.description || null,
    discountType: values.discountType,
    discountValue: Number(values.discountValue),
    maxDiscount: values.discountType === 'PERCENT' ? orNull(values.maxDiscount) : null,
    minOrderValue: Number(values.minOrderValue || 0),
    startAt: values.startAt!.toISOString(),
    endAt: values.endAt!.toISOString(),
    usageLimit: orNull(values.usageLimit),
    perUserLimit: Number(values.perUserLimit),
    isPublic: values.isPublic,
    isActive: values.isActive,
  };
}

const moneyAdornment = {
  input: { endAdornment: <InputAdornment position="end">₫</InputAdornment> },
};

interface VoucherFormDialogProps {
  open: boolean;
  /** null = thêm mới */
  voucher: AdminVoucher | null;
  onClose: () => void;
}

/** Hộp thoại Thêm / Sửa voucher (M11 mục 4.4) */
export function VoucherFormDialog({ open, voucher, onClose }: VoucherFormDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const save = useSaveVoucher();
  const narrow = useMediaQuery('(max-width: 639px)');
  const { control, handleSubmit, reset, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues(),
  });
  const [discountType, discountValue, maxDiscount, minOrderValue] = useWatch({
    control,
    name: ['discountType', 'discountValue', 'maxDiscount', 'minOrderValue'],
  });

  useEffect(() => {
    if (open) reset(voucher ? toValues(voucher) : emptyValues());
  }, [open, voucher, reset]);

  const used = (voucher?.orderCount ?? 0) > 0;
  const locked = (field: Path<FormValues>) =>
    used && !(EDITABLE_WHEN_USED as readonly string[]).includes(field);

  const onSubmit = handleSubmit((values) => {
    const payload = toPayload(values);
    // Đã có đơn dùng → chỉ gửi các trường được sửa
    const body = used
      ? Object.fromEntries(EDITABLE_WHEN_USED.map((key) => [key, payload[key]]))
      : payload;
    save.mutate(
      { id: voucher?.id, payload: body },
      {
        onSuccess: () => {
          enqueueSnackbar(voucher ? 'Đã cập nhật voucher' : 'Đã thêm voucher', {
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

  const dateField = (name: 'startAt' | 'endAt', label: string) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={label}
          value={field.value}
          onChange={field.onChange}
          disabled={locked(name)}
          ampm={false}
          format="DD/MM/YYYY HH:mm"
          slotProps={{
            textField: {
              fullWidth: true,
              required: true,
              error: Boolean(fieldState.error),
              helperText: fieldState.error?.message,
            },
          }}
        />
      )}
    />
  );

  const section = (title: string, children: ReactNode) => (
    <section className={styles.group}>
      <h3 className={styles.groupTitle}>{title}</h3>
      {children}
    </section>
  );

  return (
    <Dialog
      open={open}
      onClose={save.isPending ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={narrow}
    >
      <form onSubmit={onSubmit} noValidate className={styles.form}>
        <DialogTitle>{voucher ? `Sửa voucher ${voucher.code}` : 'Thêm voucher'}</DialogTitle>
        <DialogContent className={styles.content}>
          {used && (
            <Alert severity="info" icon={<IconLock width={20} />}>
              Voucher đã được dùng trong {voucher!.orderCount} đơn — chỉ sửa được mô tả, thời gian
              kết thúc, tổng lượt, hiển thị và trạng thái.
            </Alert>
          )}
          {section(
            'Mã & mô tả',
            <div className={styles.pair}>
              <FormTextField
                control={control}
                name="code"
                label="Mã"
                required
                autoFocus={!voucher}
                disabled={locked('code')}
                helperText="4–30 ký tự A–Z, 0–9"
                slotProps={{ htmlInput: { className: 'uppercase' } }}
              />
              <FormTextField control={control} name="description" label="Mô tả (hiện trên thẻ)" />
            </div>,
          )}

          {section(
            'Mức giảm',
            <>
              <Controller
                control={control}
                name="discountType"
                render={({ field }) => (
                  <RadioGroup row value={field.value} onChange={field.onChange}>
                    <FormControlLabel
                      value="PERCENT"
                      control={<Radio size="small" />}
                      label="Giảm theo %"
                      disabled={locked('discountType')}
                    />
                    <FormControlLabel
                      value="FIXED"
                      control={<Radio size="small" />}
                      label="Giảm số tiền"
                      disabled={locked('discountType')}
                    />
                  </RadioGroup>
                )}
              />
              <div className={styles.pair}>
                <FormTextField
                  control={control}
                  name="discountValue"
                  label="Mức giảm"
                  required
                  disabled={locked('discountValue')}
                  slotProps={{
                    htmlInput: { inputMode: 'numeric' },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          {discountType === 'PERCENT' ? '%' : '₫'}
                        </InputAdornment>
                      ),
                    },
                  }}
                  helperText={
                    discountType === 'FIXED' && discountValue
                      ? formatPrice(Number(discountValue))
                      : undefined
                  }
                />
                {discountType === 'PERCENT' && (
                  <FormTextField
                    control={control}
                    name="maxDiscount"
                    label="Giảm tối đa"
                    disabled={locked('maxDiscount')}
                    slotProps={{ htmlInput: { inputMode: 'numeric' }, ...moneyAdornment }}
                    helperText={
                      maxDiscount ? formatPrice(Number(maxDiscount)) : 'Để trống = không giới hạn'
                    }
                  />
                )}
                <FormTextField
                  control={control}
                  name="minOrderValue"
                  label="Đơn tối thiểu"
                  disabled={locked('minOrderValue')}
                  slotProps={{ htmlInput: { inputMode: 'numeric' }, ...moneyAdornment }}
                  helperText={
                    Number(minOrderValue) > 0
                      ? formatPrice(Number(minOrderValue))
                      : '0 = không yêu cầu'
                  }
                />
              </div>
            </>,
          )}

          {section(
            'Thời gian',
            <div className={styles.pair}>
              {dateField('startAt', 'Bắt đầu')}
              {dateField('endAt', 'Kết thúc')}
            </div>,
          )}

          {section(
            'Giới hạn',
            <div className={styles.pair}>
              <FormTextField
                control={control}
                name="usageLimit"
                label="Tổng lượt dùng"
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                helperText={
                  voucher
                    ? `Đã dùng ${voucher.usedCount} · để trống = không giới hạn`
                    : 'Để trống = không giới hạn'
                }
              />
              <FormTextField
                control={control}
                name="perUserLimit"
                label="Lượt / người"
                required
                disabled={locked('perUserLimit')}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
            </div>,
          )}

          {section(
            'Hiển thị',
            <div className={styles.switches}>
              <Controller
                control={control}
                name="isPublic"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={field.onChange} />}
                    label="Hiện ở trang chủ"
                  />
                )}
              />
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={field.onChange} />}
                    label="Đang bật"
                  />
                )}
              />
            </div>,
          )}
        </DialogContent>
        <DialogActions className={styles.actions}>
          <Button onClick={onClose} disabled={save.isPending} color="inherit">
            Huỷ
          </Button>
          <Button type="submit" variant="contained" loading={save.isPending}>
            {voucher ? 'Lưu' : 'Thêm voucher'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
