import { env } from '../config/env';
import { withTransaction } from '../db/transaction';
import * as bookRepository from '../repositories/book.repository';
import * as reviewRepository from '../repositories/review.repository';
import type {
  AdminReviewQuery,
  CreateReviewInput,
  PublicReviewQuery,
  UpdateReviewInput,
} from '../schemas/review.schema';
import type { MyReview } from '../types/review.types';
import { AppError } from '../utils/AppError';
import { vietnamDateRange } from '../utils/date';
import { isUniqueViolation } from '../utils/dbError';
import { buildMeta } from '../utils/pagination';
import { escapeLike } from '../utils/sql';

// Đánh giá sách (F15) — docs/03-modules/10-review.md mục 3

function reviewNotFound() {
  return AppError.notFound('Không tìm thấy đánh giá');
}

/** Sách phải đang hiện trên cửa hàng (sách ẩn không có trang chi tiết → 404) */
async function ensurePublicBook(bookId: number) {
  if ((await bookRepository.findPublicCategoryId(bookId)) === null) {
    throw AppError.notFound('Không tìm thấy sách');
  }
}

// ---------- Công khai ----------

export async function getSummary(bookId: number) {
  await ensurePublicBook(bookId);
  return reviewRepository.summary(bookId);
}

export async function listPublic(bookId: number, query: PublicReviewQuery) {
  await ensurePublicBook(bookId);
  const { items, total } = await reviewRepository.listPublic(
    bookId,
    { rating: query.rating, withContent: query.withContent },
    query,
  );
  return { items, meta: buildMeta(total, query) };
}

// ---------- Khách hàng ----------

export function getStatusForBook(userId: number, bookId: number) {
  return reviewRepository.statusForBook(userId, bookId, env.REVIEW_EDIT_DAYS);
}

export function listMineByOrder(userId: number, orderId: number) {
  return reviewRepository.listMineByOrder(userId, orderId, env.REVIEW_EDIT_DAYS);
}

/** Viết đánh giá (quy tắc 1–4, 7): đơn của mình, Đã giao, có sách này; mỗi sách 1 lần / đơn */
export async function createReview(userId: number, input: CreateReviewInput): Promise<MyReview> {
  let id: number;
  try {
    id = await withTransaction(async (client) => {
      if (!(await reviewRepository.isReviewable(userId, input.orderId, input.bookId, client))) {
        throw new AppError(
          400,
          'REVIEW_NOT_ALLOWED',
          'Chỉ đánh giá được sách trong đơn hàng đã giao của bạn',
        );
      }
      const reviewId = await reviewRepository.insert({ userId, ...input }, client);
      await reviewRepository.refreshBookRating(input.bookId, client);
      return reviewId;
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(409, 'ALREADY_REVIEWED', 'Bạn đã đánh giá sách này trong đơn hàng này');
    }
    throw err;
  }
  return (await reviewRepository.findMine(userId, id, env.REVIEW_EDIT_DAYS))!;
}

/** Sửa (quy tắc 5): của mình, chưa bị ẩn, trong REVIEW_EDIT_DAYS ngày */
export async function updateReview(
  userId: number,
  id: number,
  input: UpdateReviewInput,
): Promise<MyReview> {
  await withTransaction(async (client) => {
    const review = await reviewRepository.findForUpdate(id, client);
    if (!review || review.userId !== userId) throw reviewNotFound();
    if (review.isHidden) {
      throw new AppError(400, 'REVIEW_HIDDEN', 'Đánh giá đã bị ẩn nên không thể chỉnh sửa');
    }
    const deadline = review.createdAt.getTime() + env.REVIEW_EDIT_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() >= deadline) {
      throw new AppError(
        400,
        'REVIEW_EDIT_EXPIRED',
        `Chỉ sửa được đánh giá trong ${env.REVIEW_EDIT_DAYS} ngày kể từ lúc viết`,
      );
    }
    await reviewRepository.update(id, input, client);
    await reviewRepository.refreshBookRating(review.bookId, client);
  });
  return (await reviewRepository.findMine(userId, id, env.REVIEW_EDIT_DAYS))!;
}

// ---------- Admin ----------

export async function listForAdmin(query: AdminReviewQuery) {
  const range = vietnamDateRange(query.from, query.to);
  const { items, total } = await reviewRepository.listForAdmin(
    {
      keyword: query.q ? escapeLike(query.q) : undefined,
      rating: query.rating,
      status: query.status,
      from: range.from,
      to: range.to,
      sort: query.sort,
    },
    query,
  );
  return { items, meta: buildMeta(total, query) };
}

/** Ẩn (lý do bắt buộc) / hiện lại (quy tắc 9) — điểm sách tính lại ngay */
export async function setHidden(adminId: number, id: number, reason: string | null) {
  await withTransaction(async (client) => {
    const review = await reviewRepository.findForUpdate(id, client);
    if (!review) throw reviewNotFound();
    if (reason !== null && review.isHidden) {
      throw new AppError(400, 'ALREADY_HIDDEN', 'Đánh giá này đang bị ẩn');
    }
    if (reason === null && !review.isHidden) {
      throw new AppError(400, 'NOT_HIDDEN', 'Đánh giá này đang hiển thị');
    }
    await reviewRepository.setHidden(id, reason === null ? null : { reason, adminId }, client);
    await reviewRepository.refreshBookRating(review.bookId, client);
  });
}
