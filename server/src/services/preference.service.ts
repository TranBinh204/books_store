import { withTransaction } from '../db/transaction';
import { authorRepository } from '../repositories/named-entity.repository';
import * as preferenceRepository from '../repositories/preference.repository';
import type { NamedRef } from '../repositories/preference.repository';
import type { SavePreferencesInput } from '../schemas/preference.schema';
import { AppError } from '../utils/AppError';

// Sở thích đọc sách (F20) — docs/03-modules/15-ai.md mục 3.1

export interface Preferences {
  /** false → client hiện hộp thoại "Bạn thích đọc gì?" ở lần đăng nhập đầu */
  onboarded: boolean;
  categories: NamedRef[];
  authors: NamedRef[];
  note: string;
}

export async function getPreferences(userId: number): Promise<Preferences> {
  const [row, categories, authors] = await Promise.all([
    preferenceRepository.findByUser(userId),
    preferenceRepository.listCategories(userId),
    preferenceRepository.listAuthors(userId),
  ]);
  return { onboarded: Boolean(row?.onboardedAt), categories, authors, note: row?.note ?? '' };
}

function invalidIds(field: string, message: string) {
  return new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', [{ field, message }]);
}

/** Ghi đè toàn bộ sở thích (lần đầu lưu → đánh dấu đã hỏi) */
export async function savePreferences(
  userId: number,
  input: SavePreferencesInput,
): Promise<Preferences> {
  if (
    input.categoryIds.length > 0 &&
    (await preferenceRepository.countActiveCategories(input.categoryIds)) !==
      input.categoryIds.length
  ) {
    throw invalidIds('categoryIds', 'Có thể loại không tồn tại hoặc đang bị ẩn');
  }
  if (
    input.authorIds.length > 0 &&
    (await authorRepository.countExisting(input.authorIds)) !== input.authorIds.length
  ) {
    throw invalidIds('authorIds', 'Có tác giả không tồn tại');
  }

  await withTransaction(async (client) => {
    await preferenceRepository.upsertNote(userId, input.note, client);
    await preferenceRepository.replaceCategories(userId, input.categoryIds, client);
    await preferenceRepository.replaceAuthors(userId, input.authorIds, client);
  });
  return getPreferences(userId);
}

/** "Bỏ qua" ở hộp thoại lần đầu → không hỏi lại */
export async function skipOnboarding(userId: number): Promise<Preferences> {
  await preferenceRepository.markOnboarded(userId);
  return getPreferences(userId);
}
