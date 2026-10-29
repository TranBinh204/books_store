import { withTransaction } from '../db/transaction';
import * as bookRepository from '../repositories/book.repository';
import * as inventoryLogRepository from '../repositories/inventory-log.repository';
import type { ChangeStockInput, InventoryLogQuery } from '../schemas/inventory.schema';
import { AppError } from '../utils/AppError';
import { vietnamDateRange } from '../utils/date';
import { escapeLike } from '../utils/sql';
import { buildMeta } from '../utils/pagination';

export interface StockChangeResult {
  bookId: number;
  previousStock: number;
  stock: number;
  change: number;
}

/**
 * Nhập hàng (IMPORT: cộng thêm) hoặc điều chỉnh (ADJUST: đặt về số thực tế).
 * Khoá dòng sách trong transaction → nhiều thao tác cùng lúc không làm sai tồn kho.
 */
export async function changeStock(
  bookId: number,
  input: ChangeStockInput,
  adminId: number,
): Promise<StockChangeResult> {
  return withTransaction(async (client) => {
    const current = await bookRepository.lockStock(bookId, client);
    if (current === null) throw AppError.notFound('Không tìm thấy sách');

    const stock = input.type === 'IMPORT' ? current + input.quantity : input.newStock;
    if (stock < 0) throw new AppError(400, 'INSUFFICIENT_STOCK', 'Tồn kho không được âm');
    const change = stock - current;
    if (change === 0) {
      throw new AppError(
        400,
        'STOCK_UNCHANGED',
        'Tồn kho thực tế bằng tồn kho hiện tại, không có gì thay đổi',
        [{ field: 'newStock', message: 'Tồn kho không thay đổi' }],
      );
    }

    await bookRepository.setStock(bookId, stock, client);
    await inventoryLogRepository.insert(
      {
        bookId,
        change,
        stockAfter: stock,
        reason: input.type,
        note: input.note,
        createdBy: adminId,
      },
      client,
    );
    return { bookId, previousStock: current, stock, change };
  });
}

export async function listLogs(query: InventoryLogQuery) {
  const { items, total } = await inventoryLogRepository.list(
    {
      keyword: query.q ? escapeLike(query.q) : undefined,
      bookId: query.bookId,
      reason: query.reason,
      ...vietnamDateRange(query.from, query.to),
    },
    query,
  );
  return { items, meta: buildMeta(total, query) };
}
