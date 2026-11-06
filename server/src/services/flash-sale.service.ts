import type { Queryable } from '../db/pool';
import { withTransaction } from '../db/transaction';
import type { FlashSaleRow } from '../repositories/book.repository';
import * as flashSaleRepository from '../repositories/flash-sale.repository';
import type { AdminFlashSaleQuery, FlashSaleBody } from '../schemas/flash-sale.schema';
import type {
  AdminFlashSaleDetail,
  CurrentFlashSale,
  FlashSaleBook,
  UpcomingFlashSale,
} from '../types/flash-sale.types';
import { AppError, type ErrorDetail } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { toPublicItem } from './book.service';

// Flash Sale (F17) — docs/03-modules/12-promotion-flash-sale.md mục 3

// ---------- Giá hiệu lực (dùng chung giỏ hàng & đặt hàng) ----------

export interface FlashPricing {
  unitPrice: number;
  /** Dòng giá sale được áp — null = giá thường */
  flashSaleItemId: number | null;
  /** Vượt giới hạn / người (quy tắc 4) — dòng giỏ báo lỗi, không đặt được */
  limitExceeded: boolean;
  /** Số cuốn khách còn được mua giá sale */
  allowed: number;
}

/**
 * Giá 1 dòng (quy tắc 3, 4, 6):
 * - không có flash sale / giá sale ≥ giá bán / suất còn lại < số lượng → giá thường
 * - khách đã mua hết lượt giá sale (`bought` ≥ giới hạn) → giá thường
 * - số lượng > số lượt còn lại → giá sale nhưng `limitExceeded` (phải giảm số lượng)
 */
export function priceLine(
  flash: Pick<FlashSaleRow, 'itemId' | 'salePrice' | 'quantity' | 'sold' | 'perUserLimit'> | null,
  price: number,
  quantity: number,
  bought: number,
): FlashPricing {
  const regular: FlashPricing = {
    unitPrice: price,
    flashSaleItemId: null,
    limitExceeded: false,
    allowed: 0,
  };
  if (!flash || flash.salePrice >= price || flash.quantity - flash.sold < quantity) return regular;
  const allowed = flash.perUserLimit - bought;
  if (allowed <= 0) return regular;
  return {
    unitPrice: flash.salePrice,
    flashSaleItemId: flash.itemId,
    limitExceeded: quantity > allowed,
    allowed,
  };
}

export const countBoughtByUser = flashSaleRepository.countBoughtByUser;

/**
 * Trong transaction tạo đơn (sau khi khoá sách): khoá & đọc lại các dòng suất đang hiệu lực.
 * Trả Map itemId → dòng đã khoá (dòng hết hiệu lực không có trong Map → giá thường).
 */
export async function lockForOrder(
  flashRows: FlashSaleRow[],
  client: Queryable,
): Promise<Map<number, flashSaleRepository.LockedFlashSaleItem>> {
  const locked = await flashSaleRepository.lockForOrder(
    [...new Set(flashRows.map((row) => row.flashSaleId))].sort((a, b) => a - b),
    flashRows.map((row) => row.itemId),
    client,
  );
  return new Map(locked.map((row) => [row.id, row]));
}

export const addSold = flashSaleRepository.addSold;

/** Huỷ đơn → trả suất (quy tắc 7) — trong transaction huỷ đơn, sau khi khoá sách */
export const releaseForOrder = flashSaleRepository.releaseForOrder;

// ---------- Cửa hàng ----------

/** Sắp xếp khối Flash Sale: còn suất trước, % giảm cao trước (mục 4.1) */
function compareBooks(a: FlashSaleBook, b: FlashSaleBook) {
  const soldOutA = a.flashSale.sold >= a.flashSale.quantity ? 1 : 0;
  const soldOutB = b.flashSale.sold >= b.flashSale.quantity ? 1 : 0;
  return soldOutA - soldOutB || b.flashSale.discountPercent - a.flashSale.discountPercent;
}

/** GET /api/flash-sales/current — null nếu không có chương trình đang chạy (Q9) */
export async function getCurrent(): Promise<CurrentFlashSale | null> {
  const sale = await flashSaleRepository.findCurrent();
  if (!sale) return null;
  const rows = await flashSaleRepository.listCurrentBooks(sale.id);
  const items = rows
    .map((row) => toPublicItem(row, true))
    .filter((item): item is FlashSaleBook => item.flashSale !== null)
    .sort(compareBooks);
  return { ...sale, items };
}

/** GET /api/flash-sales/upcoming — chương trình sắp diễn ra sớm nhất (không kèm sách/giá) hoặc null */
export async function getUpcoming(): Promise<UpcomingFlashSale | null> {
  return flashSaleRepository.findUpcoming();
}

// ---------- Admin ----------

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const formatDateTime = (date: Date) => dateTimeFormatter.format(date).replace(',', '');

function notFound() {
  return AppError.notFound('Không tìm thấy chương trình Flash Sale');
}

function locked(message: string) {
  return new AppError(409, 'FLASH_SALE_LOCKED', message);
}

function invalid(issues: ErrorDetail[]) {
  return new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', issues);
}

/** Chương trình đang bật không chồng giờ chương trình đang bật khác (Q1) */
async function assertNoOverlap(body: FlashSaleBody, excludeId: number | null, client: Queryable) {
  if (!body.isActive) return;
  const other = await flashSaleRepository.findOverlap(body.startAt, body.endAt, excludeId, client);
  if (other) {
    const message = `Trùng thời gian với chương trình "${other.name}" (${formatDateTime(
      other.startAt,
    )} – ${formatDateTime(other.endAt)})`;
    throw new AppError(409, 'FLASH_SALE_OVERLAP', message, [{ field: 'startAt', message }]);
  }
}

interface ExistingItem {
  salePrice: number;
  quantity: number;
  sold: number;
}

/**
 * Kiểm tra từng dòng sách (quy tắc 2, 9) — `existing`: dòng đang có trong chương trình (khi sửa):
 * - dòng mới / đổi giá: sách đang bán, giá sale < giá bán hiện tại
 * - dòng mới / tăng số suất: suất còn lại (số suất − đã bán) ≤ tồn kho hiện tại
 */
async function checkItems(
  items: FlashSaleBody['items'],
  existing: Map<number, ExistingItem>,
  client: Queryable,
): Promise<ErrorDetail[]> {
  const books = new Map(
    (
      await flashSaleRepository.findBooks(
        items.map((item) => item.bookId),
        client,
      )
    ).map((book) => [book.id, book]),
  );
  const issues: ErrorDetail[] = [];
  items.forEach((item, index) => {
    const book = books.get(item.bookId);
    if (!book) {
      issues.push({ field: `items.${index}.bookId`, message: 'Sách không tồn tại' });
      return;
    }
    const current = existing.get(item.bookId);
    if (!current || current.salePrice !== item.salePrice) {
      if (!book.isActive) {
        issues.push({ field: `items.${index}.bookId`, message: `"${book.title}" đã ngừng bán` });
      } else if (item.salePrice >= book.price) {
        issues.push({
          field: `items.${index}.salePrice`,
          message: `Giá sale phải nhỏ hơn giá bán hiện tại (${book.price.toLocaleString('vi-VN')}₫)`,
        });
      }
    }
    const sold = current?.sold ?? 0;
    if (
      (!current || item.quantity > current.quantity) &&
      item.quantity >= sold &&
      item.quantity - sold > book.stock
    ) {
      issues.push({
        field: `items.${index}.quantity`,
        message:
          book.stock > 0
            ? `Vượt tồn kho — chỉ còn ${book.stock} cuốn (tối đa ${book.stock + sold} suất)`
            : `"${book.title}" đã hết hàng`,
      });
    }
  });
  return issues;
}

export async function listForAdmin(query: AdminFlashSaleQuery) {
  const { items, total } = await flashSaleRepository.listForAdmin(query.status, query);
  return { items, meta: buildMeta(total, query) };
}

export async function getForAdmin(id: number): Promise<AdminFlashSaleDetail> {
  const sale = await flashSaleRepository.findForAdmin(id);
  if (!sale) throw notFound();
  return { ...sale, items: await flashSaleRepository.listItemsForAdmin(id) };
}

export async function create(body: FlashSaleBody): Promise<AdminFlashSaleDetail> {
  const id = await withTransaction(async (client) => {
    await flashSaleRepository.lockAdminWrites(client);
    const issues = await checkItems(body.items, new Map(), client);
    if (issues.length > 0) throw invalid(issues);
    await assertNoOverlap(body, null, client);
    const newId = await flashSaleRepository.insert(body, client);
    await flashSaleRepository.insertItems(newId, body.items, client);
    return newId;
  });
  return getForAdmin(id);
}

/**
 * Sửa toàn bộ (quy tắc 10). Đã bắt đầu / đã có đơn → không đổi giờ bắt đầu.
 * Sách đã có đơn mua giá sale → không đổi giá sale / giới hạn, không xoá. Số suất ≥ đã bán.
 */
export async function update(id: number, body: FlashSaleBody): Promise<AdminFlashSaleDetail> {
  await withTransaction(async (client) => {
    await flashSaleRepository.lockAdminWrites(client);
    if (!(await flashSaleRepository.lockById(id, client))) throw notFound();
    const current = (await flashSaleRepository.findForAdmin(id, client))!;
    const currentItems = await flashSaleRepository.listItemsForAdmin(id, client);
    const byBook = new Map(currentItems.map((item) => [item.book.id, item]));

    const started = current.startAt.getTime() <= Date.now();
    if (
      (started || current.orderCount > 0) &&
      body.startAt.getTime() !== current.startAt.getTime()
    ) {
      throw locked('Chương trình đã bắt đầu — không đổi được thời gian bắt đầu');
    }

    const nextBookIds = new Set(body.items.map((item) => item.bookId));
    for (const item of currentItems) {
      if (item.orderCount === 0) continue;
      const next = body.items.find((candidate) => candidate.bookId === item.book.id);
      if (!next)
        throw locked(`"${item.book.title}" đã có người mua — không xoá được khỏi chương trình`);
      if (next.salePrice !== item.salePrice || next.perUserLimit !== item.perUserLimit) {
        throw locked(
          `"${item.book.title}" đã có người mua — không sửa được giá sale / giới hạn mỗi người`,
        );
      }
    }

    const issues = await checkItems(body.items, byBook, client);
    body.items.forEach((item, index) => {
      const existing = byBook.get(item.bookId);
      if (existing && item.quantity < existing.sold) {
        issues.push({
          field: `items.${index}.quantity`,
          message: `Số suất không được nhỏ hơn số đã bán (${existing.sold})`,
        });
      }
    });
    if (issues.length > 0) throw invalid(issues);
    await assertNoOverlap(body, id, client);

    await flashSaleRepository.update(id, body, client);
    await flashSaleRepository.removeItems(
      currentItems.filter((item) => !nextBookIds.has(item.book.id)).map((item) => item.id),
      client,
    );
    for (const item of body.items) {
      const existing = byBook.get(item.bookId);
      if (existing) await flashSaleRepository.updateItem(existing.id, item, client);
    }
    await flashSaleRepository.insertItems(
      id,
      body.items.filter((item) => !byBook.has(item.bookId)),
      client,
    );
  });
  return getForAdmin(id);
}

/** Dừng sớm = tắt chương trình */
export async function stop(id: number): Promise<AdminFlashSaleDetail> {
  await withTransaction(async (client) => {
    await flashSaleRepository.lockAdminWrites(client);
    if (!(await flashSaleRepository.lockById(id, client))) throw notFound();
    await flashSaleRepository.setActive(id, false, client);
  });
  return getForAdmin(id);
}

/** Xoá cứng khi chưa có đơn nào mua giá sale (quy tắc 11) */
export async function remove(id: number): Promise<void> {
  await withTransaction(async (client) => {
    await flashSaleRepository.lockAdminWrites(client);
    if (!(await flashSaleRepository.lockById(id, client))) throw notFound();
    const sale = (await flashSaleRepository.findForAdmin(id, client))!;
    if (sale.orderCount > 0) {
      throw locked('Chương trình đã có đơn mua giá sale — chỉ có thể dừng');
    }
    await flashSaleRepository.remove(id, client);
  });
}
