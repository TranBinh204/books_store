import { withTransaction } from '../db/transaction';
import * as bookRepository from '../repositories/book.repository';
import * as cartRepository from '../repositories/cart.repository';
import { BOOK_MAX_SELECT_QUANTITY } from '../schemas/book-public.schema';
import { CART_MAX_ITEMS, type CartLineInput } from '../schemas/cart.schema';
import type { Cart, CartAdjustment, CartIssue, CartItem } from '../types/cart.types';
import { AppError } from '../utils/AppError';
import { discountPercentOf } from './book.service';
import { countBoughtByUser, priceLine } from './flash-sale.service';

// Giỏ hàng (F10) — docs/03-modules/05-cart.md mục 3

type Book = bookRepository.CartBookRow;

/** Số lượng chọn được tối đa: min(tồn kho, 99); ngừng bán → 0 */
const maxQuantityOf = (book: Book) =>
  book.isAvailable ? Math.min(Math.max(book.stock, 0), BOOK_MAX_SELECT_QUANTITY) : 0;

function issueOf(book: Book, quantity: number): CartIssue | null {
  if (!book.isAvailable) return 'UNAVAILABLE';
  if (book.stock <= 0) return 'OUT_OF_STOCK';
  if (quantity > maxQuantityOf(book)) return 'EXCEEDS_STOCK';
  return null;
}

/** Gộp dòng trùng sách (cộng số lượng), giữ thứ tự xuất hiện đầu tiên */
function mergeDuplicates(lines: CartLineInput[]): CartLineInput[] {
  const merged = new Map<number, number>();
  for (const { bookId, quantity } of lines) {
    merged.set(bookId, (merged.get(bookId) ?? 0) + quantity);
  }
  return [...merged].map(([bookId, quantity]) => ({ bookId, quantity }));
}

/**
 * Dựng giỏ từ các dòng (bookId, quantity) + thông tin sách HIỆN TẠI. Sách không còn tồn tại → bỏ.
 * Giá Flash Sale tính như lúc đặt hàng (M12); khách chưa đăng nhập coi như chưa mua lượt nào.
 */
async function buildCart(lines: CartLineInput[], userId: number | null): Promise<Cart> {
  const books = new Map(
    (await bookRepository.findCartBooks(lines.map((line) => line.bookId))).map((b) => [b.id, b]),
  );
  const flashItemIds = [...books.values()].flatMap((book) =>
    book.flashSale ? [book.flashSale.itemId] : [],
  );
  const bought = userId ? await countBoughtByUser(userId, flashItemIds) : new Map<number, number>();

  const items: CartItem[] = [];
  for (const { bookId, quantity } of lines) {
    const book = books.get(bookId);
    if (!book) continue;
    const flash = book.flashSale;
    const pricing = priceLine(
      flash,
      book.price,
      quantity,
      flash ? (bought.get(flash.itemId) ?? 0) : 0,
    );
    const issue = issueOf(book, quantity) ?? (pricing.limitExceeded ? 'FLASH_SALE_LIMIT' : null);
    items.push({
      bookId,
      title: book.title,
      coverUrl: book.coverUrl,
      price: pricing.unitPrice,
      originalPrice: book.originalPrice,
      discountPercent: discountPercentOf(book.originalPrice, pricing.unitPrice),
      quantity,
      maxQuantity: maxQuantityOf(book),
      lineTotal: pricing.unitPrice * quantity,
      issue,
      flashSale:
        flash && pricing.flashSaleItemId !== null
          ? {
              perUserLimit: flash.perUserLimit,
              allowed: pricing.allowed,
              endAt: new Date(flash.endAt),
            }
          : null,
    });
  }

  const valid = items.filter((item) => item.issue === null);
  return {
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: valid.reduce((sum, item) => sum + item.lineTotal, 0),
    hasIssues: valid.length !== items.length,
  };
}

/** Giỏ của khách (lưu ở trình duyệt) — chỉ xem, không lưu gì */
export function preview(lines: CartLineInput[]): Promise<Cart> {
  return buildCart(mergeDuplicates(lines), null);
}

export async function getCart(userId: number): Promise<Cart> {
  return buildCart(await cartRepository.listByUser(userId), userId);
}

/** Sách thêm được vào giỏ: đang bán & còn hàng */
function assertAddable(book: Book | undefined): asserts book is Book {
  if (!book || !book.isAvailable) {
    throw new AppError(400, 'BOOK_UNAVAILABLE', 'Sản phẩm không còn kinh doanh');
  }
  if (book.stock <= 0) throw new AppError(409, 'OUT_OF_STOCK', 'Sản phẩm đã hết hàng');
}

function cartFullError() {
  return new AppError(
    409,
    'CART_FULL',
    `Giỏ hàng tối đa ${CART_MAX_ITEMS} sản phẩm — hãy đặt hàng hoặc xoá bớt`,
  );
}

/**
 * Thêm vào giỏ: cộng dồn với số đã có; vượt min(tồn kho, 99) → giảm về mức tối đa
 * (trả `adjustment` để client báo "Chỉ còn N sản phẩm").
 */
export async function addItem(
  userId: number,
  { bookId, quantity }: CartLineInput,
): Promise<{ cart: Cart; adjustment: CartAdjustment | null }> {
  const adjustment = await withTransaction(async (client) => {
    await cartRepository.lockUser(userId, client);
    const [book] = await bookRepository.findCartBooks([bookId], client);
    assertAddable(book);

    const lines = await cartRepository.listByUser(userId, client);
    const existing = lines.find((line) => line.bookId === bookId);
    if (!existing && lines.length >= CART_MAX_ITEMS) throw cartFullError();

    const requested = (existing?.quantity ?? 0) + quantity;
    const next = Math.min(requested, maxQuantityOf(book));
    await cartRepository.upsert(userId, bookId, next, client);
    return requested > next ? { bookId, requested, quantity: next } : null;
  });
  return { cart: await getCart(userId), adjustment };
}

/** Đặt số lượng 1 dòng (vượt mức tối đa → giảm về tối đa) */
export async function setQuantity(
  userId: number,
  bookId: number,
  quantity: number,
): Promise<{ cart: Cart; adjustment: CartAdjustment | null }> {
  const [book] = await bookRepository.findCartBooks([bookId]);
  assertAddable(book);
  const next = Math.min(quantity, maxQuantityOf(book));
  if (!(await cartRepository.updateQuantity(userId, bookId, next))) {
    throw AppError.notFound('Sản phẩm không có trong giỏ hàng');
  }
  return {
    cart: await getCart(userId),
    adjustment: quantity > next ? { bookId, requested: quantity, quantity: next } : null,
  };
}

export async function removeItem(userId: number, bookId: number): Promise<Cart> {
  if (!(await cartRepository.remove(userId, bookId))) {
    throw AppError.notFound('Sản phẩm không có trong giỏ hàng');
  }
  return getCart(userId);
}

export async function clear(userId: number): Promise<void> {
  await cartRepository.clear(userId);
}

/**
 * Gộp giỏ trình duyệt vào giỏ tài khoản khi đăng nhập: cộng dồn từng sách, giảm theo tồn kho,
 * bỏ qua sách không bán / hết hàng / vượt giới hạn số đầu sách. `merged` = số dòng đã gộp được.
 */
export async function merge(
  userId: number,
  lines: CartLineInput[],
): Promise<{ cart: Cart; merged: number }> {
  const incoming = mergeDuplicates(lines);
  const merged = await withTransaction(async (client) => {
    await cartRepository.lockUser(userId, client);
    const current = new Map(
      (await cartRepository.listByUser(userId, client)).map((l) => [l.bookId, l.quantity]),
    );
    const books = new Map(
      (
        await bookRepository.findCartBooks(
          incoming.map((l) => l.bookId),
          client,
        )
      ).map((b) => [b.id, b]),
    );

    let count = 0;
    for (const { bookId, quantity } of incoming) {
      const book = books.get(bookId);
      if (!book || !book.isAvailable || book.stock <= 0) continue;
      const existing = current.get(bookId);
      if (existing === undefined && current.size >= CART_MAX_ITEMS) continue;
      const next = Math.min((existing ?? 0) + quantity, maxQuantityOf(book));
      await cartRepository.upsert(userId, bookId, next, client);
      current.set(bookId, next);
      count += 1;
    }
    return count;
  });
  return { cart: await getCart(userId), merged };
}
