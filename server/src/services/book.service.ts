import { env } from '../config/env';
import { withTransaction } from '../db/transaction';
import { removeImages } from '../lib/image-storage';
import * as bookRepository from '../repositories/book.repository';
import * as categoryRepository from '../repositories/category.repository';
import * as inventoryLogRepository from '../repositories/inventory-log.repository';
import { authorRepository, publisherRepository } from '../repositories/named-entity.repository';
import {
  BOOK_MAX_SELECT_QUANTITY,
  RELATED_BOOK_LIMIT,
  SUGGESTION_LIMIT,
  SUGGESTION_MIN_LENGTH,
  type PublicBookListQuery,
} from '../schemas/book-public.schema';
import type { BookListQuery, CreateBookInput, UpdateBookInput } from '../schemas/book.schema';
import type { BookFlashSale } from '../types/flash-sale.types';
import type {
  BookDetail,
  BookSuggestion,
  PublicBookDetail,
  PublicBookListItem,
  PublisherFacet,
  StockStatus,
} from '../types/catalog.types';
import { AppError } from '../utils/AppError';
import { isUniqueViolation } from '../utils/dbError';
import { vietnamDateRange } from '../utils/date';
import { escapeLike } from '../utils/sql';
import { buildMeta } from '../utils/pagination';

export function stockStatusOf(stock: number): StockStatus {
  if (stock <= 0) return 'OUT_OF_STOCK';
  return stock <= env.LOW_STOCK_THRESHOLD ? 'LOW_STOCK' : 'IN_STOCK';
}

export async function list(query: BookListQuery) {
  const created = vietnamDateRange(query.createdFrom, query.createdTo);
  const { items, total } = await bookRepository.list(
    {
      keyword: query.q ? escapeLike(query.q) : undefined,
      isbn: query.q?.replace(/[-\s]/g, ''),
      categoryId: query.categoryId,
      authorId: query.authorId,
      publisherId: query.publisherId,
      isActive: query.status === undefined ? undefined : query.status === 'active',
      stock: query.stock,
      lowStockThreshold: env.LOW_STOCK_THRESHOLD,
      createdFrom: created.from,
      createdTo: created.to,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort: query.sort,
    },
    query,
  );
  return {
    items: items.map((item) => ({ ...item, stockStatus: stockStatusOf(item.stock) })),
    meta: buildMeta(total, query),
  };
}

export async function getDetail(id: number): Promise<BookDetail> {
  const book = await bookRepository.findDetail(id);
  if (!book) throw AppError.notFound('Không tìm thấy sách');
  return { ...book, stockStatus: stockStatusOf(book.stock) };
}

function isbnExistsError() {
  return new AppError(409, 'ISBN_EXISTS', 'ISBN đã được dùng cho sách khác', [
    { field: 'isbn', message: 'ISBN đã được dùng cho sách khác' },
  ]);
}

/** Danh mục, NXB, tác giả phải tồn tại; ISBN không trùng */
async function assertReferences(input: UpdateBookInput, bookId?: number) {
  if (!(await categoryRepository.findById(input.categoryId))) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy danh mục', [
      { field: 'categoryId', message: 'Danh mục không tồn tại' },
    ]);
  }
  if (input.publisherId !== null && !(await publisherRepository.findById(input.publisherId))) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy nhà xuất bản', [
      { field: 'publisherId', message: 'Nhà xuất bản không tồn tại' },
    ]);
  }
  if ((await authorRepository.countExisting(input.authorIds)) !== input.authorIds.length) {
    throw new AppError(404, 'NOT_FOUND', 'Có tác giả không tồn tại', [
      { field: 'authorIds', message: 'Có tác giả không tồn tại' },
    ]);
  }
  if (input.isbn && (await bookRepository.isbnExists(input.isbn, bookId))) throw isbnExistsError();
}

async function withIsbnCheck<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (err) {
    if (isUniqueViolation(err, 'books_isbn_key')) throw isbnExistsError();
    throw err;
  }
}

export async function create(input: CreateBookInput, adminId: number): Promise<BookDetail> {
  await assertReferences(input);
  const { authorIds, images, initialStock, ...fields } = input;

  const id = await withIsbnCheck(() =>
    withTransaction(async (client) => {
      const bookId = await bookRepository.insert({ ...fields, stock: initialStock }, client);
      await bookRepository.replaceAuthors(bookId, authorIds, client);
      await bookRepository.replaceImages(bookId, images, client);
      if (initialStock > 0) {
        await inventoryLogRepository.insert(
          {
            bookId,
            change: initialStock,
            stockAfter: initialStock,
            reason: 'IMPORT',
            note: 'Tồn kho ban đầu',
            createdBy: adminId,
          },
          client,
        );
      }
      return bookId;
    }),
  );

  return getDetail(id);
}

export async function update(id: number, input: UpdateBookInput): Promise<BookDetail> {
  if (!(await bookRepository.exists(id))) throw AppError.notFound('Không tìm thấy sách');
  await assertReferences(input, id);
  const { authorIds, images, ...fields } = input;

  const removedImages = await withIsbnCheck(() =>
    withTransaction(async (client) => {
      await bookRepository.updateFields(id, fields, client);
      await bookRepository.replaceAuthors(id, authorIds, client);
      return bookRepository.replaceImages(id, images, client);
    }),
  );

  // Lưu thành công mới xoá file ảnh bị bỏ (lỗi xoá file không ảnh hưởng dữ liệu)
  await removeImages(removedImages);
  return getDetail(id);
}

export async function setStatus(id: number, isActive: boolean): Promise<BookDetail> {
  if (!(await bookRepository.exists(id))) throw AppError.notFound('Không tìm thấy sách');
  await bookRepository.setActive(id, isActive);
  return getDetail(id);
}

// ============================================================
// Cửa hàng — API công khai (M03): chỉ sách đang bán thuộc danh mục đang hiển thị
// ============================================================

/** Phần trăm giảm giá: (79000, 63200) → 20 — cùng cách tính với client (lib/format.ts) */
export function discountPercentOf(originalPrice: number, price: number): number {
  if (originalPrice <= 0 || price >= originalPrice) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/**
 * Flash sale đang chạy của sách (M12 mục 5.2). Hết suất → null, trừ khi `keepSoldOut`
 * (trang chi tiết & khối Flash Sale vẫn hiện "Hết suất").
 */
export function toBookFlashSale(
  row: bookRepository.FlashSaleRow | null,
  originalPrice: number,
  keepSoldOut = false,
): BookFlashSale | null {
  if (!row || (!keepSoldOut && row.sold >= row.quantity)) return null;
  return {
    salePrice: row.salePrice,
    discountPercent: discountPercentOf(originalPrice, row.salePrice),
    quantity: row.quantity,
    sold: row.sold,
    perUserLimit: row.perUserLimit,
    endAt: new Date(row.endAt),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sách tạo trong vòng NEW_BOOK_DAYS ngày gần đây → "sách mới" (tem "Mới" trên thẻ) */
export function isNewBook(createdAt: Date, now = Date.now()) {
  return now - new Date(createdAt).getTime() <= env.NEW_BOOK_DAYS * DAY_MS;
}

/**
 * Bỏ `stock`, `createdAt` (dữ liệu nội bộ), thay bằng `stockStatus` + `discountPercent` + `isNew` + `flashSale`
 */
export function toPublicItem<T extends bookRepository.PublicBookRow>(
  { stock, createdAt, flashSale, ...book }: T,
  keepSoldOut = false,
) {
  return {
    ...book,
    isNew: isNewBook(createdAt),
    discountPercent: discountPercentOf(book.originalPrice, book.price),
    stockStatus: stockStatusOf(stock),
    flashSale: toBookFlashSale(flashSale, book.originalPrice, keepSoldOut),
  };
}

function bookNotFound() {
  return AppError.notFound('Không tìm thấy sách');
}

/** Từ khoá → điều kiện tìm: tên sách / tác giả (escape LIKE) + ISBN (bỏ "-", khoảng trắng) */
function keywordFilters(q: string | undefined) {
  return {
    keyword: q ? escapeLike(q) : undefined,
    isbn: q?.replace(/[-\s]/g, '').toUpperCase(),
  };
}

export async function listPublic(query: PublicBookListQuery) {
  // `relevance` chỉ có nghĩa khi có từ khoá
  const sort =
    query.sort === 'relevance' && !query.q
      ? 'created_desc'
      : (query.sort ?? (query.q ? 'relevance' : 'created_desc'));

  const { items, total } = await bookRepository.listPublic(
    {
      ...keywordFilters(query.q),
      categoryId: query.categoryId,
      authorId: query.authorId,
      publisherIds: query.publisherIds,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      sort,
    },
    query,
  );
  return {
    items: items.map((item): PublicBookListItem => toPublicItem(item)),
    meta: buildMeta(total, query),
  };
}

export async function getPublicDetail(id: number): Promise<PublicBookDetail> {
  const book = await bookRepository.findPublicDetail(id);
  if (!book) throw bookNotFound();
  return {
    ...toPublicItem(book, true),
    maxQuantity: Math.min(book.stock, BOOK_MAX_SELECT_QUANTITY),
  };
}

export async function getRelated(id: number): Promise<PublicBookListItem[]> {
  const categoryId = await bookRepository.findPublicCategoryId(id);
  if (categoryId === null) throw bookNotFound();
  const books = await bookRepository.listRelated(id, categoryId, RELATED_BOOK_LIMIT);
  return books.map((book) => toPublicItem(book));
}

export async function getFacets(categoryId: number): Promise<{ publishers: PublisherFacet[] }> {
  return { publishers: await bookRepository.listPublisherFacets(categoryId) };
}

/** Gợi ý khi gõ: từ khoá < SUGGESTION_MIN_LENGTH ký tự → rỗng */
export async function suggest(q: string | undefined): Promise<BookSuggestion[]> {
  if (!q || q.length < SUGGESTION_MIN_LENGTH) return [];
  const { items } = await bookRepository.listPublic(
    { ...keywordFilters(q), sort: 'relevance' },
    { page: 1, limit: SUGGESTION_LIMIT },
  );
  // Đang flash sale → hiện giá sale (giá thống nhất mọi nơi — M12 Q11)
  return items.map(({ id, title, coverUrl, authors, price, originalPrice, flashSale }) => ({
    id,
    title,
    coverUrl,
    authors,
    price: toBookFlashSale(flashSale, originalPrice)?.salePrice ?? price,
    originalPrice,
  }));
}
