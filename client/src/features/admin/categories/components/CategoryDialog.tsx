'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormTextField } from '@/components/ui/FormTextField';
import { CATEGORY_ICON_KEYS, CATEGORY_ICON_LABELS, Icon } from '@/components/ui/Icon';
import { applyServerErrors, errorMessage } from '@/lib/form';
import type { Category, CategoryNode } from '../../catalog-types';
import { useSaveCategory } from '../hooks/useCategories';

const schema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên danh mục').max(100, 'Tối đa 100 ký tự'),
  parentId: z.number().nullable(),
  sortOrder: z.number({ error: 'Nhập số' }).int().min(0, 'Không được âm').max(9999),
  isActive: z.boolean(),
  iconKey: z.enum(CATEGORY_ICON_KEYS).nullable(),
  description: z.string().max(300, 'Tối đa 300 ký tự'),
});
type FormValues = z.infer<typeof schema>;

interface CategoryDialogProps {
  open: boolean;
  /** null = thêm mới */
  category: Category | null;
  /** Thêm danh mục con cho danh mục này */
  defaultParentId?: number | null;
  roots: CategoryNode[];
  onClose: () => void;
}

export function CategoryDialog({
  open,
  category,
  defaultParentId = null,
  roots,
  onClose,
}: CategoryDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const save = useSaveCategory();
  const { control, handleSubmit, reset, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      parentId: null,
      sortOrder: 0,
      isActive: true,
      iconKey: null,
      description: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      category
        ? {
            name: category.name,
            parentId: category.parentId,
            sortOrder: category.sortOrder,
            isActive: category.isActive,
            iconKey: (category.iconKey as FormValues['iconKey']) ?? null,
            description: category.description ?? '',
          }
        : {
            name: '',
            parentId: defaultParentId,
            sortOrder: 0,
            isActive: true,
            iconKey: null,
            description: '',
          },
    );
  }, [open, category, defaultParentId, reset]);

  // Danh mục đang có con thì chỉ được là danh mục gốc (giới hạn 2 cấp)
  const hasChildren = roots.some((root) => root.id === category?.id && root.children.length > 0);
  const parentOptions = roots.filter((root) => root.id !== category?.id);

  const onSubmit = handleSubmit((values) =>
    save.mutate(
      // Ô mô tả để trống = xoá mô tả (null)
      { id: category?.id, payload: { ...values, description: values.description.trim() || null } },
      {
        onSuccess: () => {
          enqueueSnackbar(category ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục', {
            variant: 'success',
          });
          onClose();
        },
        onError: (error) => {
          if (!applyServerErrors(error, setError, ['name', 'parentId', 'description'])) {
            enqueueSnackbar(errorMessage(error), { variant: 'error' });
          }
        },
      },
    ),
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>{category ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
        <DialogContent className="flex flex-col gap-4 !pt-2">
          <FormTextField control={control} name="name" label="Tên danh mục" required autoFocus />
          <Controller
            control={control}
            name="parentId"
            render={({ field, fieldState }) => (
              <TextField
                select
                label="Danh mục cha"
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(event.target.value === '' ? null : Number(event.target.value))
                }
                disabled={hasChildren}
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error?.message ??
                  (hasChildren
                    ? 'Danh mục đang có danh mục con nên phải là danh mục gốc'
                    : undefined)
                }
                fullWidth
              >
                <MenuItem value="">— Không có (danh mục gốc) —</MenuItem>
                {parentOptions.map((root) => (
                  <MenuItem key={root.id} value={root.id}>
                    {root.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            control={control}
            name="sortOrder"
            render={({ field, fieldState }) => (
              <TextField
                type="number"
                label="Thứ tự hiển thị"
                value={field.value}
                onChange={(event) => field.onChange(Number(event.target.value))}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? 'Số nhỏ hiển thị trước'}
                fullWidth
              />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="Mô tả ngắn"
                multiline
                minRows={2}
                maxRows={4}
                error={Boolean(fieldState.error)}
                helperText={
                  fieldState.error?.message ??
                  `${field.value.length}/300 · Hiện ở đầu trang danh mục trên cửa hàng`
                }
                fullWidth
              />
            )}
          />
          {/* Icon nét mảnh trên mega menu, lá bài tarot (giao diện Dark Fantasy) */}
          <Controller
            control={control}
            name="iconKey"
            render={({ field }) => (
              <div>
                <FormLabel className="mb-1 block text-sm">Icon trên cửa hàng</FormLabel>
                <ToggleButtonGroup
                  exclusive
                  value={field.value ?? 'none'}
                  onChange={(_event, value: string | null) => {
                    if (value !== null) field.onChange(value === 'none' ? null : value);
                  }}
                  className="flex flex-wrap"
                  size="small"
                >
                  <ToggleButton value="none" aria-label="Mặc định (cuốn sách)">
                    <Tooltip title="Mặc định (cuốn sách)">
                      <span className="flex">
                        <Icon name={null} className="h-7 w-7" />
                      </span>
                    </Tooltip>
                  </ToggleButton>
                  {CATEGORY_ICON_KEYS.map((key) => (
                    <ToggleButton key={key} value={key} aria-label={CATEGORY_ICON_LABELS[key]}>
                      <Tooltip title={CATEGORY_ICON_LABELS[key]}>
                        <span className="flex">
                          <Icon name={key} className="h-7 w-7" />
                        </span>
                      </Tooltip>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </div>
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
                label="Hiển thị trên cửa hàng"
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Huỷ
          </Button>
          <Button type="submit" variant="contained" loading={save.isPending}>
            Lưu
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
