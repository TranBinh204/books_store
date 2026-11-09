import { z } from 'zod';
import { env } from '../config/env';
import { idSchema } from './common.schema';

/** Danh sách id không trùng */
function uniqueIds(max: number, label: string) {
  return z
    .array(idSchema, { error: `Danh sách ${label} không hợp lệ` })
    .max(max, `Chọn tối đa ${max} ${label}`)
    .transform((ids) => [...new Set(ids)]);
}

// Sở thích đọc sách (M15) — mọi phần đều không bắt buộc
export const savePreferencesSchema = z.object({
  categoryIds: uniqueIds(env.PREFERENCE_MAX_CATEGORIES, 'thể loại').default([]),
  authorIds: uniqueIds(env.PREFERENCE_MAX_AUTHORS, 'tác giả').default([]),
  note: z
    .string()
    .trim()
    .max(env.PREFERENCE_NOTE_MAX_LENGTH, `Mô tả tối đa ${env.PREFERENCE_NOTE_MAX_LENGTH} ký tự`)
    .default(''),
});

export type SavePreferencesInput = z.infer<typeof savePreferencesSchema>;
