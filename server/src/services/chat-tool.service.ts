import type { z } from 'zod';
import { env } from '../config/env';
import { getPolicy } from '../lib/ai/store-policy';
import { toolArgSchemas, type ToolName } from '../schemas/chat.schema';
import type { OrderStatus } from '../schemas/order.schema';
import type { PublicBookListItem } from '../types/catalog.types';
import type { PaymentStatus } from '../types/order.types';
import { AppError } from '../utils/AppError';
import * as bookService from './book.service';
import * as categoryService from './category.service';
import * as orderService from './order.service';
import * as recommendationService from './recommendation.service';

// Chạy công cụ AI xin gọi (M16 mục 6.2) — CHỈ ĐỌC. userId luôn lấy từ token (ctx), không bao giờ từ AI.
// Kết quả gửi lại AI ở dạng gọn (không ảnh, không HTML) để tiết kiệm token.

export interface ToolContext {
  userId: number;
}

export interface ToolOutput {
  /** Gửi lại cho AI (JSON) */
  result: unknown;
  /** Sách xuất hiện trong kết quả (id → tên) — chỉ những sách này mới được hiện thẻ */
  books: Map<number, string>;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã huỷ',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

const STOCK_LABELS = { IN_STOCK: 'Còn hàng', LOW_STOCK: 'Sắp hết hàng', OUT_OF_STOCK: 'Hết hàng' };

const isToolName = (name: string): name is ToolName => Object.hasOwn(toolArgSchemas, name);

/** Thông tin gọn của 1 cuốn gửi AI — giá bán là giá Flash Sale nếu đang có */
function compactBook(book: PublicBookListItem) {
  return {
    id: book.id,
    ten: book.title,
    tacGia: book.authors.map((author) => author.name).join(', ') || null,
    giaBan: book.flashSale?.salePrice ?? book.price,
    giaBia: book.originalPrice,
    flashSale: Boolean(book.flashSale),
    tinhTrang: STOCK_LABELS[book.stockStatus],
  };
}

const bookMap = (books: { id: number; title: string }[]) =>
  new Map(books.map((book) => [book.id, book.title]));

const noBooks = (result: unknown): ToolOutput => ({ result, books: new Map() });

function stripHtml(html: string | null, max: number) {
  const text = (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** So khớp tên danh mục không phân biệt hoa thường / dấu */
function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
}

async function findCategoryId(name: string): Promise<number | null> {
  const wanted = normalize(name);
  const tree = await categoryService.getPublicTree();
  const all = tree.flatMap((node) => [node, ...node.children]);
  const exact = all.find((category) => normalize(category.name) === wanted);
  const partial = all.find((category) => normalize(category.name).includes(wanted));
  return (exact ?? partial)?.id ?? null;
}

const handlers: {
  [K in ToolName]: (
    args: z.infer<(typeof toolArgSchemas)[K]>,
    ctx: ToolContext,
  ) => Promise<ToolOutput>;
} = {
  async search_books(args) {
    let categoryId: number | undefined;
    if (args.categoryName) {
      const id = await findCategoryId(args.categoryName);
      if (id === null) return noBooks({ error: 'CATEGORY_NOT_FOUND', hint: 'Xem list_categories' });
      categoryId = id;
    }
    const [minPrice, maxPrice] =
      args.minPrice !== undefined && args.maxPrice !== undefined && args.minPrice > args.maxPrice
        ? [args.maxPrice, args.minPrice]
        : [args.minPrice, args.maxPrice];
    const { items, meta } = await bookService.listPublic({
      page: 1,
      limit: env.CHAT_SEARCH_LIMIT,
      q: args.q || undefined,
      categoryId,
      minPrice,
      maxPrice,
      sort: args.sort === 'relevance' && !args.q ? undefined : args.sort,
    });
    return {
      result: { tongSoKetQua: meta.total, sach: items.map(compactBook) },
      books: bookMap(items),
    };
  },

  async get_book({ bookId }) {
    try {
      const book = await bookService.getPublicDetail(bookId);
      return {
        result: {
          ...compactBook(book),
          danhMuc: book.category.name,
          nhaXuatBan: book.publisher?.name ?? null,
          namXuatBan: book.publishYear,
          soTrang: book.pages,
          diemDanhGia:
            book.ratingCount > 0 ? `${book.ratingAvg}/5 (${book.ratingCount} đánh giá)` : null,
          moTa: stripHtml(book.description, env.RECOMMEND_DESCRIPTION_MAX_LENGTH) || null,
        },
        books: bookMap([book]),
      };
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 404) {
        return noBooks({ error: 'BOOK_NOT_FOUND' });
      }
      throw err;
    }
  },

  async list_categories() {
    const tree = await categoryService.getPublicTree();
    return noBooks(
      tree.map((node) => ({
        ten: node.name,
        danhMucCon: node.children.map((child) => child.name),
      })),
    );
  },

  async get_store_policy({ topic }) {
    return noBooks({ chuDe: topic, noiDung: getPolicy(topic) });
  },

  async recommend_for_me(_args, { userId }) {
    const { items } = await recommendationService.getRecommendations(userId);
    const books = items.slice(0, env.CHAT_SEARCH_LIMIT);
    return {
      result: books.map(({ book, reason }) => ({ ...compactBook(book), lyDo: reason })),
      books: bookMap(books.map(({ book }) => book)),
    };
  },

  async list_my_orders(_args, { userId }) {
    const { items } = await orderService.listOrders(userId, {
      page: 1,
      limit: env.CHAT_ORDER_LIMIT,
    });
    return noBooks({
      ghiChu: `Chỉ gồm ${env.CHAT_ORDER_LIMIT} đơn gần nhất`,
      donHang: items.map((order) => ({
        maDon: order.code,
        ngayDat: order.createdAt,
        trangThai: STATUS_LABELS[order.status],
        thanhToan: `${order.paymentMethod === 'VNPAY' ? 'VNPay' : 'COD'} – ${PAYMENT_STATUS_LABELS[order.paymentStatus]}`,
        tongTien: order.total,
        sach: order.previewItems.map((item) => `${item.title} x${item.quantity}`),
        soDauSachKhac: order.moreCount,
      })),
    });
  },
};

/**
 * Chạy 1 công cụ theo tên + tham số JSON AI gửi. Tên lạ / tham số sai → trả lỗi cho AI (không ném ra ngoài)
 * để AI tự sửa hoặc trả lời khách. Lỗi hệ thống (DB…) vẫn ném ra.
 */
export async function runTool(
  name: string,
  rawArgs: string,
  ctx: ToolContext,
): Promise<ToolOutput> {
  if (!isToolName(name)) return noBooks({ error: 'UNKNOWN_TOOL' });
  let json: unknown;
  try {
    json = rawArgs.trim() ? JSON.parse(rawArgs) : {};
  } catch {
    return noBooks({ error: 'INVALID_ARGUMENTS' });
  }
  const parsed = toolArgSchemas[name].safeParse(json ?? {});
  if (!parsed.success) {
    return noBooks({ error: 'INVALID_ARGUMENTS', detail: parsed.error.issues[0]?.message });
  }
  const handler = handlers[name] as (args: unknown, ctx: ToolContext) => Promise<ToolOutput>;
  return handler(parsed.data, ctx);
}
