'use client';

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { IconButton, InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import { useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

type FormTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'inputRef'
> & {
  name: Path<T>;
  control: Control<T>;
};

/** TextField của MUI gắn sẵn react-hook-form; type="password" có nút hiện / ẩn mật khẩu */
export function FormTextField<T extends FieldValues>({
  name,
  control,
  type,
  helperText,
  slotProps,
  ...props
}: FormTextFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  return (
    <TextField
      {...props}
      {...field}
      value={field.value ?? ''}
      inputRef={field.ref}
      type={isPassword && showPassword ? 'text' : type}
      error={Boolean(fieldState.error)}
      helperText={fieldState.error?.message ?? helperText}
      fullWidth
      slotProps={{
        ...slotProps,
        input: isPassword
          ? {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowPassword((value) => !value)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? (
                      <VisibilityOff fontSize="small" />
                    ) : (
                      <Visibility fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }
          : slotProps?.input,
      }}
    />
  );
}
