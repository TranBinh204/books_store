import { env } from '../config/env';
import { withTransaction } from '../db/transaction';
import * as bookRepository from '../repositories/book.repository';
import * as wishlistRepository from '../repositories/wishlist.repository';
import type { WishlistQuery } from '../schemas/wishlist.schema';
import type { WishlistItem } from '../types/wishlist.types';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { toPublicItem } from './book.service';

// Sách yêu thích (F14) — docs/03-modules/09-wishlist.md mục 3

export async function listWishlist(userId: number, query: WishlistQuery) {
  const { items, total } = await wishlistRepository.listByUser(userId, query);
  return {
    items: items.map((item): WishlistItem => toPublicItem(item)),
    meta: buildMeta(total, query),
  };
}

export function listBookIds(userId: number) {
  return wishlistRepository.listBookIds(userId);
}

/**
 * Thêm (quy tắc 3, 4, 6): chỉ sách đang bán (kể cả hết hàng); đã có → vẫn thành công;
 * đủ WISHLIST_MAX_ITEMS → 409. Khoá theo người dùng để thêm song song không vượt giới hạn.
 */
export async function addBook(userId: number, bookId: number): Promise<{ count: number }> {
  if ((await bookRepository.findPublicCategoryId(bookId)) === null) {
    throw AppError.notFound('Không tìm thấy sách');
  }
  return withTransaction(async (client) => {
    await wishlistRepository.lockUser(userId, client);
    if (!(await wishlistRepository.exists(userId, bookId, client))) {
      const count = await wishlistRepository.countByUser(userId, client);
      if (count >= env.WISHLIST_MAX_ITEMS) {
        throw new AppError(
          409,
          'WISHLIST_FULL',
          `Danh sách yêu thích đã đầy (tối đa ${env.WISHLIST_MAX_ITEMS} sách)`,
        );
      }
      await wishlistRepository.insert(userId, bookId, client);
    }
    return { count: await wishlistRepository.countByUser(userId, client) };
  });
}

/** Bỏ — không có cũng không lỗi (quy tắc 3) */
export function removeBook(userId: number, bookId: number) {
  return wishlistRepository.remove(userId, bookId);
}
