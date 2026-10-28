import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './http';

/**
 * Gắn lỗi từ server (details theo từng trường) vào ô nhập tương ứng của form.
 * Trả về true nếu đã gắn được ít nhất 1 lỗi → không cần hiện toast nữa.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiError) || !error.details?.length) return false;
  let applied = false;
  for (const detail of error.details) {
    if ((fields as readonly string[]).includes(detail.field)) {
      setError(detail.field as Path<T>, { type: 'server', message: detail.message });
      applied = true;
    }
  }
  return applied;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã có lỗi xảy ra, vui lòng thử lại sau';
}
