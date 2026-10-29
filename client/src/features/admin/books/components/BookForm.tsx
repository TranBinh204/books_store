'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, FormControlLabel, InputAdornment, MenuItem, Switch, TextField } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSnackbar } from 'notistack';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch, type Path } from 'react-hook-form';
import { FormTextField } from '@/components/ui/FormTextField';
import { discountPercent, formatPrice } from '@/lib/format';
import { errorMessage } from '@/lib/form';
import { ApiError } from '@/lib/http';
import { COVER_TYPE_LABEL, type BookDetail } from '../../catalog-types';
import { CategorySelect } from '../../categories';
import type { BookPayload } from '../api/book.api';
import { useSaveBook } from '../hooks/useBooks';
import { bookFormSchema, EMPTY_BOOK_FORM, type BookFormValues } from '../schemas/book-form.schema';
import { EntityAutocomplete } from './EntityAutocomplete';
import styles from './BookForm.module.css';
import { ImageUploader } from './ImageUploader';

/** Tên trường lỗi từ server → tên ô trong form */
const SERVER_FIELD: Record<string, Path<BookFormValues>> = {
  title: 'title',
  categoryId: 'categoryId',
  authorIds: 'authors',
  publisherId: 'publisher',
  isbn: 'isbn',
  description: 'description',
  publishYear: 'publishYear',
  pages: 'pages',
  size: 'size',
  weightGram: 'weightGram',
  originalPrice: 'originalPrice',
  price: 'price',
  images: 'images',
  initialStock: 'initialStock',
};

function toFormValues(book: BookDetail): BookFormValues {
  const text = (value: string | number | null) => (value === null ? '' : String(value));
  return {
    title: book.title,
    categoryId: book.category.id,
    authors: book.authors,
    publisher: book.publisher,
    isbn: text(book.isbn),
    description: text(book.description),
    publishYear: text(book.publishYear),
    pages: text(book.pages),
    size: text(book.size),
    weightGram: text(book.weightGram),
    coverType: book.coverType ?? '',
    originalPrice: String(book.originalPrice),
    price: String(book.price),
    isActive: book.isActive,
    initialStock: '0',
    images: book.images.map(({ url, publicId }) => ({ url, publicId })),
  };
}

function toPayload(values: BookFormValues, isNew: boolean): BookPayload {
  const numberOrNull = (value: string) => (value === '' ? null : Number(value));
  const textOrNull = (value: string) => value.trim() || null;
  return {
    title: values.title.trim(),
    categoryId: values.categoryId!,
    authorIds: values.authors.map((author) => author.id),
    publisherId: values.publisher?.id ?? null,
    isbn: textOrNull(values.isbn),
    description: textOrNull(values.description),
    publishYear: numberOrNull(values.publishYear),
    pages: numberOrNull(values.pages),
    size: textOrNull(values.size),
    weightGram: numberOrNull(values.weightGram),
    coverType: values.coverType || null,
    originalPrice: Number(values.originalPrice),
    price: Number(values.price),
    isActive: values.isActive,
    images: values.images,
    ...(isNew && { initialStock: Number(values.initialStock || 0) }),
  };
}

function Section({
  title,
  className,
  children,
}: {
  title: string;
  /** Vị trí khi xếp 1 cột (`order` trong module CSS) */
  className: string;
  children: ReactNode;
}) {
  return (
    <section className={`a-panel ${styles.section} ${className}`}>
      <h2>{title}</h2>
      <div className={styles.fields}>{children}</div>
    </section>
  );
}

/** Form thêm / sửa sách. Tồn kho chỉ nhập lúc thêm mới; sau đó đổi qua "Nhập hàng / Điều chỉnh" */
export function BookForm({ book }: { book?: BookDetail }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const save = useSaveBook();
  const isNew = !book;

  const { control, handleSubmit, setError } = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: book ? toFormValues(book) : EMPTY_BOOK_FORM,
  });
  const [originalPrice, price] = useWatch({ control, name: ['originalPrice', 'price'] });
  const percent =
    originalPrice && price ? discountPercent(Number(originalPrice), Number(price)) : 0;

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      { id: book?.id, payload: toPayload(values, isNew) },
      {
        onSuccess: (saved) => {
          if (isNew) {
            enqueueSnackbar(`Đã thêm sách "${saved.title}"`, { variant: 'success' });
            // Thêm xong → quay về danh sách sách
            router.push('/admin/sach');
          } else {
            enqueueSnackbar('Đã lưu thay đổi', { variant: 'success' });
          }
        },
        onError: (error) => {
          let applied = false;
          if (error instanceof ApiError) {
            for (const detail of error.details ?? []) {
              const field = SERVER_FIELD[detail.field.split('.')[0]];
              if (field) {
                setError(field, { type: 'server', message: detail.message });
                applied = true;
              }
            }
          }
          if (!applied) enqueueSnackbar(errorMessage(error), { variant: 'error' });
          else enqueueSnackbar('Vui lòng kiểm tra lại các ô báo lỗi', { variant: 'error' });
        },
      },
    ),
  );

  const moneyAdornment = {
    input: { endAdornment: <InputAdornment position="end">₫</InputAdornment> },
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className={styles.grid}>
        {/* Cột trái */}
        <div className={styles.col}>
          <Section title="Thông tin sách" className={styles.info}>
            <FormTextField
              control={control}
              name="title"
              label="Tên sách"
              required
              autoFocus={isNew}
            />
            <Controller
              control={control}
              name="authors"
              render={({ field, fieldState }) => (
                <EntityAutocomplete
                  multiple
                  resource="authors"
                  label="tác giả"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="publisher"
              render={({ field, fieldState }) => (
                <EntityAutocomplete
                  resource="publishers"
                  label="nhà xuất bản"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <div className={styles.pair}>
              <FormTextField control={control} name="isbn" label="ISBN" placeholder="978..." />
              <FormTextField
                control={control}
                name="publishYear"
                label="Năm xuất bản"
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
              />
              <FormTextField
                control={control}
                name="pages"
                label="Số trang"
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
              <FormTextField
                control={control}
                name="size"
                label="Kích thước"
                placeholder="13 x 20.5 cm"
              />
              <FormTextField
                control={control}
                name="weightGram"
                label="Trọng lượng"
                slotProps={{
                  htmlInput: { inputMode: 'numeric' },
                  input: { endAdornment: <InputAdornment position="end">gram</InputAdornment> },
                }}
              />
              <Controller
                control={control}
                name="coverType"
                render={({ field }) => (
                  <TextField select label="Loại bìa" {...field} fullWidth>
                    <MenuItem value="">— Chưa chọn —</MenuItem>
                    {Object.entries(COVER_TYPE_LABEL).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </div>
          </Section>

          <Section title="Mô tả sách" className={styles.desc}>
            <FormTextField
              control={control}
              name="description"
              label="Mô tả"
              multiline
              minRows={8}
              placeholder="Giới thiệu nội dung sách... (xuống dòng được giữ nguyên khi hiển thị)"
            />
          </Section>
        </div>

        {/* Cột phải */}
        <div className={styles.col}>
          <Section title="Ảnh sách" className={styles.media}>
            <Controller
              control={control}
              name="images"
              render={({ field, fieldState }) => (
                <ImageUploader
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          </Section>

          <Section title="Giá bán" className={styles.side}>
            <FormTextField
              control={control}
              name="originalPrice"
              label="Giá bìa"
              required
              slotProps={{ htmlInput: { inputMode: 'numeric' }, ...moneyAdornment }}
              helperText={originalPrice ? formatPrice(Number(originalPrice)) : undefined}
            />
            <FormTextField
              control={control}
              name="price"
              label="Giá bán"
              required
              slotProps={{ htmlInput: { inputMode: 'numeric' }, ...moneyAdornment }}
              helperText={
                price
                  ? `${formatPrice(Number(price))}${percent > 0 ? ` · giảm ${percent}%` : ''}`
                  : undefined
              }
            />
          </Section>

          <Section title="Phân loại & trạng thái" className={styles.side}>
            <Controller
              control={control}
              name="categoryId"
              render={({ field, fieldState }) => (
                <CategorySelect
                  label="Danh mục"
                  required
                  fullWidth
                  value={field.value}
                  onChange={field.onChange}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                  }
                  label={field.value ? 'Đang bán (hiện trên cửa hàng)' : 'Đã ẩn'}
                />
              )}
            />
            {isNew && (
              <FormTextField
                control={control}
                name="initialStock"
                label="Tồn kho ban đầu"
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                helperText="Sau khi tạo, thay đổi tồn kho qua Nhập hàng / Điều chỉnh"
              />
            )}
          </Section>
        </div>
      </div>

      <div className="a-savebar">
        <Button component={Link} href="/admin/sach" color="inherit">
          Quay lại
        </Button>
        <Button type="submit" variant="contained" loading={save.isPending}>
          {isNew ? 'Thêm sách' : 'Lưu thay đổi'}
        </Button>
      </div>
    </form>
  );
}
