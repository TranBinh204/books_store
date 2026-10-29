'use client';

import { ListSubheader, MenuItem, TextField, type TextFieldProps } from '@mui/material';
import { useCategories } from '../hooks/useCategories';

type CategorySelectProps = Omit<TextFieldProps, 'select' | 'value' | 'onChange'> & {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Hiện lựa chọn "Tất cả danh mục" (dùng cho bộ lọc) */
  allowAll?: boolean;
};

/** Ô chọn danh mục dạng cây 2 cấp: danh mục gốc in đậm, danh mục con thụt vào */
export function CategorySelect({ value, onChange, allowAll, ...props }: CategorySelectProps) {
  const { data: roots = [] } = useCategories();

  return (
    <TextField
      select
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
      {...props}
    >
      {allowAll && <MenuItem value="">Tất cả danh mục</MenuItem>}
      {roots.length === 0 && (
        <ListSubheader>Chưa có danh mục — hãy tạo ở mục &quot;Danh mục&quot;</ListSubheader>
      )}
      {roots.flatMap((root) => [
        <MenuItem key={root.id} value={root.id} sx={{ fontWeight: 600 }}>
          {root.name}
          {!root.isActive && ' (đã ẩn)'}
        </MenuItem>,
        ...root.children.map((child) => (
          <MenuItem key={child.id} value={child.id} sx={{ pl: 4 }}>
            {child.name}
            {!child.isActive && ' (đã ẩn)'}
          </MenuItem>
        )),
      ])}
    </TextField>
  );
}
