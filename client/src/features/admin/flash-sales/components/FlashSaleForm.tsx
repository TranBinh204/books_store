'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Tooltip,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs, { type Dayjs } from 'dayjs';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type Path } from 'react-hook-form';
import { z } from 'zod';
import { BookCover } from '@/components/shop/BookCover';
import { AdminTag } from '@/components/ui/AdminTag';
import { FormTextField } from '@/components/ui/FormTextField';
import { IconLock, IconTrash } from '@/components/ui/icons';
import { UsageBar } from '@/components/ui/UsageBar';
import { applyServerErrors, errorMessage } from '@/lib/form';
import { discountPercent, formatPrice } from '@/lib/format';
import { useSaveFlashSale } from '../hooks/useAdminFlashSales';
import type { AdminFlashSaleDetail, FlashSalePayload } from '../types';
import { BookPicker } from './BookPicker';
import styles from './FlashSaleForm.module.css';

const digits = (label: string) =>
  z.string().trim().regex(/^\d*$/, `${label} chỉ gồm chữ số`).min(1, `Nhập ${label.toLowerCase()}`);

const itemSchema = z.object({
  bookId: z.number(),
  title: z.string(),
  coverUrl: z.string().nullable(),
  price: z.number(),
  stock: z.number(),
  sold: z.number(),
  orderCount: z.number(),
  /** Giá sale lúc tải form — đổi giá thì kiểm tra lại < giá bán */
  initialSalePrice: z.number().nullable(),
  /** Số suất lúc tải form — chỉ kiểm tra tồn kho khi thêm mới / tăng suất (quy tắc 9) */
  initialQuantity: z.number().nullable(),
  salePrice: digits('Giá sale'),
  quantity: digits('Số suất'),
  perUserLimit: digits('Giới hạn'),
});

const schema = z
  .object({
    name: z.string().trim().min(1, 'Vui lòng nhập tên chương trình').max(150, 'Tối đa 150 ký tự'),
    startAt: z.custom<Dayjs | null>(),
    endAt: z.custom<Dayjs | null>(),
    isActive: z.boolean(),
    items: z.array(itemSchema).min(1, 'Vui lòng thêm ít nhất 1 sách'),
  })
  .superRefine((values, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message });
    if (!values.startAt?.isValid()) issue(['startAt'], 'Vui lòng chọn thời gian bắt đầu');
    if (!values.endAt?.isValid()) issue(['endAt'], 'Vui lòng chọn thời gian kết thúc');
    else if (values.startAt?.isValid() && !values.endAt.isAfter(values.startAt)) {
      issue(['endAt'], 'Thời gian kết thúc phải sau thời gian bắt đầu');
    }
    values.items.forEach((item, index) => {
      const salePrice = Number(item.salePrice);
      if (item.salePrice && salePrice <= 0) issue(['items', index, 'salePrice'], 'Phải lớn hơn 0');
      else if (item.salePrice && salePrice !== item.initialSalePrice && salePrice >= item.price) {
        issue(['items', index, 'salePrice'], 'Phải nhỏ hơn giá bán');
      }
      if (item.quantity && Number(item.quantity) <= 0) {
        issue(['items', index, 'quantity'], 'Phải lớn hơn 0');
      } else if (item.quantity && Number(item.quantity) < item.sold) {
        issue(['items', index, 'quantity'], `Không nhỏ hơn đã bán (${item.sold})`);
      } else if (
        item.quantity &&
        (item.initialQuantity === null || Number(item.quantity) > item.initialQuantity) &&
        Number(item.quantity) - item.sold > item.stock
      ) {
        issue(['items', index, 'quantity'], `Tối đa ${item.stock + item.sold} (tồn ${item.stock})`);
      }
      const limit = Number(item.perUserLimit);
      if (item.perUserLimit && (limit <= 0 || limit > 99)) {
        issue(['items', index, 'perUserLimit'], 'Từ 1 đến 99');
      }
    });
  });
type FormValues = z.infer<typeof schema>;
type ItemValues = FormValues['items'][number];

function emptyValues(): FormValues {
  const start = dayjs().add(1, 'hour').startOf('hour');
  return { name: '', startAt: start, endAt: start.add(1, 'day'), isActive: true, items: [] };
}

function toValues(sale: AdminFlashSaleDetail): FormValues {
  return {
    name: sale.name,
    startAt: dayjs(sale.startAt),
    endAt: dayjs(sale.endAt),
    isActive: sale.isActive,
    items: sale.items.map((item) => ({
      bookId: item.book.id,
      title: item.book.title,
      coverUrl: item.book.coverUrl,
      price: item.book.price,
      stock: item.book.stock,
      sold: item.sold,
      orderCount: item.orderCount,
      initialSalePrice: item.salePrice,
      initialQuantity: item.quantity,
      salePrice: String(item.salePrice),
      quantity: String(item.quantity),
      perUserLimit: String(item.perUserLimit),
    })),
  };
}

function toPayload(values: FormValues): FlashSalePayload {
  return {
    name: values.name,
    startAt: values.startAt!.toISOString(),
    endAt: values.endAt!.toISOString(),
    isActive: values.isActive,
    items: values.items.map((item) => ({
      bookId: item.bookId,
      salePrice: Number(item.salePrice),
      quantity: Number(item.quantity),
      perUserLimit: Number(item.perUserLimit),
    })),
  };
}

const ITEM_FIELDS = ['bookId', 'salePrice', 'quantity', 'perUserLimit'] as const;

/** Form thêm / sửa chương trình (M12 mục 4.6) — `sale` = null là thêm mới */
export function FlashSaleForm({ sale }: { sale: AdminFlashSaleDetail | null }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const save = useSaveFlashSale();
  const { control, handleSubmit, reset, setError, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: sale ? toValues(sale) : emptyValues(),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = useWatch({ control, name: 'items' });

  useEffect(() => {
    if (sale) reset(toValues(sale));
  }, [sale, reset]);

  // Quy tắc 10: đã bắt đầu / đã có đơn → không đổi giờ bắt đầu
  const startLocked = !!sale && (dayjs(sale.startAt).isBefore(dayjs()) || sale.orderCount > 0);

  const scrollToError = () =>
    requestAnimationFrame(() =>
      document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center' }),
    );

  const onSubmit = handleSubmit((values) => {
    save.mutate(
      { id: sale?.id, payload: toPayload(values) },
      {
        onSuccess: (saved) => {
          enqueueSnackbar(sale ? 'Đã lưu chương trình' : 'Đã thêm chương trình', {
            variant: 'success',
          });
          if (!sale) router.replace(`/admin/flash-sale/${saved.id}`);
        },
        onError: (error) => {
          const serverFields = [
            'name',
            'startAt',
            'endAt',
            ...values.items.flatMap((_item, index) =>
              ITEM_FIELDS.map((field) => `items.${index}.${field}`),
            ),
          ] as Path<FormValues>[];
          if (!applyServerErrors(error, setError, serverFields)) {
            enqueueSnackbar(errorMessage(error), { variant: 'error' });
          }
        },
      },
    );
  }, scrollToError);

  const dateField = (name: 'startAt' | 'endAt', label: string, disabled: boolean) => (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={label}
          value={field.value}
          onChange={field.onChange}
          disabled={disabled}
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

  const numberCell = (
    index: number,
    name: 'salePrice' | 'quantity' | 'perUserLimit',
    label: string,
    locked: boolean,
  ) => (
    <Controller
      control={control}
      name={`items.${index}.${name}`}
      render={({ field, fieldState }) => (
        <div>
          <span className={styles.lbl}>{label}</span>
          <TextField
            {...field}
            size="small"
            disabled={locked}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message}
            slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-label': label } }}
            className={styles.input}
          />
        </div>
      )}
    />
  );

  const addBook = (book: {
    id: number;
    title: string;
    coverUrl: string | null;
    price: number;
    stock: number;
  }) => {
    const item: ItemValues = {
      bookId: book.id,
      title: book.title,
      coverUrl: book.coverUrl,
      price: book.price,
      stock: book.stock,
      sold: 0,
      orderCount: 0,
      initialSalePrice: null,
      initialQuantity: null,
      salePrice: '',
      quantity: '',
      perUserLimit: '1',
    };
    append(item);
  };

  const itemsError = formState.errors.items?.root?.message ?? formState.errors.items?.message;

  return (
    <form onSubmit={onSubmit} noValidate className={styles.form}>
      <section className={`a-panel ${styles.section}`}>
        <h2>Thông tin chương trình</h2>
        <div className={styles.fields}>
          {sale && sale.orderCount > 0 && (
            <Alert severity="info" icon={<IconLock width={20} />}>
              Đã có {sale.orderCount} đơn mua giá sale — không đổi được giờ bắt đầu; sách đã có
              người mua không sửa được giá sale / giới hạn và không xoá được. Vẫn có thể đổi tên,
              gia hạn / rút ngắn, đổi số suất, thêm sách hoặc tắt.
            </Alert>
          )}
          <FormTextField control={control} name="name" label="Tên chương trình" required />
          <div className={styles.pair}>
            {dateField('startAt', 'Bắt đầu', startLocked)}
            {dateField('endAt', 'Kết thúc', false)}
          </div>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={field.onChange} />}
                label="Bật chương trình"
              />
            )}
          />
        </div>
      </section>

      <section className={`a-panel ${styles.section}`}>
        <h2>Sách trong chương trình ({fields.length})</h2>
        <div className={styles.fields}>
          <BookPicker excludeIds={items.map((item) => item.bookId)} onPick={addBook} />
          {itemsError && <p className={styles.error}>{itemsError}</p>}
        </div>
        {fields.length === 0 ? (
          <p className={styles.empty}>Chưa có sách nào — tìm ở trên để thêm.</p>
        ) : (
          <div className={styles.list}>
            <div className={styles.head} aria-hidden>
              <span>Sách</span>
              <span>Giá sale (₫)</span>
              <span>Số suất</span>
              <span>Tối đa / khách</span>
              <span>Đã bán</span>
              <span />
            </div>
            <ul>
              {fields.map((field, index) => {
                const item = items[index] ?? field;
                const locked = item.orderCount > 0;
                const percent = discountPercent(item.price, Number(item.salePrice) || item.price);
                const bookError = formState.errors.items?.[index]?.bookId?.message;
                return (
                  <li key={field.id} className={styles.item}>
                    <div className={styles.book}>
                      <span className="a-cover">
                        <BookCover url={item.coverUrl} alt={item.title} sizes="44px" />
                      </span>
                      <div className={styles.bookText}>
                        <p className={styles.title}>{item.title}</p>
                        <p className={styles.sub}>
                          Giá bán {formatPrice(item.price)} · tồn {item.stock}
                        </p>
                        {bookError && <p className={styles.error}>{bookError}</p>}
                      </div>
                    </div>
                    <div className={styles.del}>
                      <Tooltip
                        title={
                          locked ? 'Sách đã có người mua — không xoá được' : 'Bỏ khỏi chương trình'
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => remove(index)}
                            disabled={locked}
                            aria-label={`Bỏ ${item.title}`}
                          >
                            <IconTrash width={18} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </div>
                    <div className={styles.cellSale}>
                      {numberCell(index, 'salePrice', 'Giá sale (₫)', locked)}
                      {percent > 0 && <AdminTag tone="gold">-{percent}%</AdminTag>}
                    </div>
                    {numberCell(index, 'quantity', 'Số suất', false)}
                    {numberCell(index, 'perUserLimit', 'Tối đa / khách', locked)}
                    <div className={styles.sold}>
                      <span>Đã bán {item.sold}</span>
                      <UsageBar used={item.sold} limit={Number(item.quantity) || null} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <div className="a-savebar">
        <Button color="inherit" onClick={() => router.push('/admin/flash-sale')}>
          Huỷ
        </Button>
        <Button type="submit" variant="contained" loading={save.isPending}>
          {sale ? 'Lưu' : 'Thêm chương trình'}
        </Button>
      </div>
    </form>
  );
}
