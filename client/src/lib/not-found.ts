import { notFound } from 'next/navigation';
import { ApiError } from './http';

/**
 * Server Component: API trả 404 (sách / danh mục không có hoặc đang ẩn) → trang not-found.tsx.
 * Lỗi khác ném tiếp lên error.tsx.
 */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

/** id trên URL phải là số nguyên dương, sai → 404 (không gọi API) */
export function idOrNotFound(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return id;
}
