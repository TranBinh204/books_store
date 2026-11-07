import type { Queryable } from '../db/pool';
import { withTransaction } from '../db/transaction';
import { money } from '../lib/email-templates/shared';
import * as notificationRepository from '../repositories/notification.repository';
import type { NotificationListQuery } from '../schemas/notification.schema';
import type { NewNotification, NotificationEvent } from '../types/notification.types';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';

// Thông báo cho khách hàng (F18) — docs/03-modules/13-notification.md

/** Giữ thông báo bao nhiêu ngày (Q7) */
export const NOTIFICATION_RETENTION_DAYS = 90;
/** Báo "Flash sale sắp diễn ra" trước giờ bắt đầu bao nhiêu phút (Q2) */
export const FLASH_SALE_NOTICE_MINUTES = 60;

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  hour12: false,
});
/** "14:30 06/10" (giờ Việt Nam) */
const formatTime = (date: Date) => {
  const parts = Object.fromEntries(
    timeFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.hour}:${parts.minute} ${parts.day}/${parts.month}`;
};

// ---------- Sự kiện đơn hàng (bảng 3.1) ----------

export type OrderEvent = Exclude<NotificationEvent, 'FLASH_SALE_UPCOMING'>;

/** Sự kiện cần chống trùng theo đơn: dùng chung khoá cho mọi cách huỷ (1 đơn chỉ huỷ 1 lần) */
const DEDUPE_SUFFIX: Record<OrderEvent, string> = {
  ORDER_PLACED: 'PLACED',
  PAYMENT_SUCCESS: 'PAID',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ORDER_CONFIRMED: 'CONFIRMED',
  ORDER_SHIPPING: 'SHIPPING',
  ORDER_DELIVERED: 'DELIVERED',
  ORDER_CANCELLED: 'CANCELLED',
  ORDER_EXPIRED: 'CANCELLED',
  ORDER_REFUNDED: 'REFUNDED',
};

interface OrderEventOptions {
  /** Admin huỷ: lý do · đơn đã thanh toán */
  reason?: string;
  paid?: boolean;
  /** Khách tự huỷ (khác Admin huỷ) */
  byCustomer?: boolean;
  /** Mỗi lượt thanh toán thất bại là 1 thông báo */
  paymentId?: number;
}

function orderContent(
  event: OrderEvent,
  order: notificationRepository.OrderNotifyInfo,
  options: OrderEventOptions,
): { title: string; content: string } {
  const code = `Đơn ${order.code}`;
  switch (event) {
    case 'ORDER_PLACED': {
      const summary = `${code} (${order.itemCount} sản phẩm · ${money(order.total)}) đã được ghi nhận.`;
      return {
        title: 'Đặt hàng thành công',
        content:
          order.paymentMethod === 'VNPAY' && order.paymentDueAt
            ? `${summary} Vui lòng thanh toán trước ${formatTime(order.paymentDueAt)}.`
            : summary,
      };
    }
    case 'PAYMENT_SUCCESS':
      return {
        title: 'Thanh toán thành công',
        content: `Đã nhận ${money(order.total)} cho ${code.toLowerCase()} qua VNPay.`,
      };
    case 'PAYMENT_FAILED':
      return {
        title: 'Thanh toán chưa thành công',
        content: order.paymentDueAt
          ? `${code} chưa được thanh toán — bạn có thể thanh toán lại trước ${formatTime(order.paymentDueAt)}.`
          : `${code} chưa được thanh toán.`,
      };
    case 'ORDER_CONFIRMED':
      return {
        title: 'Đơn hàng đã được xác nhận',
        content: `${code} đang được chuẩn bị.`,
      };
    case 'ORDER_SHIPPING':
      return {
        title: 'Đơn hàng đang được giao',
        content: `${code} đang trên đường tới bạn.`,
      };
    case 'ORDER_DELIVERED':
      return {
        title: 'Giao hàng thành công',
        content: `${code} đã giao. Hãy đánh giá sách để giúp người mua khác nhé!`,
      };
    case 'ORDER_CANCELLED':
      return options.byCustomer
        ? { title: 'Đã huỷ đơn hàng', content: `${code} đã được huỷ theo yêu cầu của bạn.` }
        : {
            title: 'Đơn hàng đã bị huỷ',
            content: `${code} đã bị cửa hàng huỷ. Lý do: ${options.reason ?? 'không rõ'}.${
              options.paid ? ' Cửa hàng sẽ hoàn tiền cho bạn.' : ''
            }`,
          };
    case 'ORDER_EXPIRED':
      return {
        title: 'Đơn hàng đã bị huỷ',
        content: `${code} quá hạn thanh toán nên đã tự huỷ.`,
      };
    case 'ORDER_REFUNDED':
      return {
        title: 'Đã hoàn tiền',
        content: `${money(order.total)} của ${code.toLowerCase()} đã được hoàn.`,
      };
  }
}

const TYPE_OF: Record<OrderEvent, NewNotification['type']> = {
  ORDER_PLACED: 'ORDER',
  PAYMENT_SUCCESS: 'PAYMENT',
  PAYMENT_FAILED: 'PAYMENT',
  ORDER_CONFIRMED: 'ORDER',
  ORDER_SHIPPING: 'ORDER',
  ORDER_DELIVERED: 'ORDER',
  ORDER_CANCELLED: 'ORDER',
  ORDER_EXPIRED: 'ORDER',
  ORDER_REFUNDED: 'PAYMENT',
};

/**
 * Ghi thông báo sự kiện đơn hàng — gọi TRONG transaction của sự kiện (quy tắc 2).
 * Email (nếu có) do nơi gọi gửi sau khi commit.
 */
export async function notifyOrder(
  event: OrderEvent,
  orderId: number,
  client: Queryable,
  options: OrderEventOptions = {},
) {
  const order = await notificationRepository.findOrderInfo(orderId, client);
  if (!order) return;
  const suffix =
    event === 'PAYMENT_FAILED' && options.paymentId
      ? `PAYMENT_FAILED:${options.paymentId}`
      : DEDUPE_SUFFIX[event];
  await notificationRepository.insertMany(
    [
      {
        userId: order.userId,
        type: TYPE_OF[event],
        event,
        ...orderContent(event, order, options),
        link: `/tai-khoan/don-hang/${orderId}`,
        dedupeKey: `order:${orderId}:${suffix}`,
      },
    ],
    client,
  );
}

// ---------- Flash sale sắp diễn ra (quy tắc 7) ----------

/**
 * Báo khách có sách yêu thích trong chương trình sắp bắt đầu (≤ 60 phút). Mỗi khách 1 thông báo /
 * chương trình. Gọi định kỳ bởi jobs/notify-upcoming-flash-sales.ts. Trả số chương trình đã báo.
 */
export async function notifyUpcomingFlashSales(): Promise<number> {
  return withTransaction(async (client) => {
    const sales = await notificationRepository.lockUpcomingFlashSales(
      FLASH_SALE_NOTICE_MINUTES,
      client,
    );
    for (const sale of sales) {
      const rows = await notificationRepository.listWishlistedFlashBooks(sale.id, client);
      const byUser = new Map<number, notificationRepository.WishlistedFlashBook[]>();
      for (const row of rows) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row]);

      const time = formatTime(sale.startAt);
      await notificationRepository.insertMany(
        [...byUser].map(([userId, books]) => {
          const [first] = books;
          return {
            userId,
            type: 'PROMOTION' as const,
            event: 'FLASH_SALE_UPCOMING' as const,
            title: '⚡ Flash Sale sắp bắt đầu',
            content:
              books.length === 1
                ? `"${first.title}" trong danh sách yêu thích của bạn chỉ còn ${money(first.salePrice)} lúc ${time}.`
                : `"${first.title}" và ${books.length - 1} sách yêu thích khác của bạn sắp giảm giá lúc ${time}.`,
            link: books.length === 1 ? `/sach/${first.bookId}` : '/flash-sale',
            dedupeKey: `flash-sale:${sale.id}:${sale.startAt.getTime()}`,
          };
        }),
        client,
      );
      await notificationRepository.markFlashSaleNotified(sale.id, client);
    }
    return sales.length;
  });
}

/** Xoá thông báo cũ hơn 90 ngày (quy tắc 9) */
export function purgeOldNotifications() {
  return notificationRepository.purgeOlderThan(NOTIFICATION_RETENTION_DAYS);
}

// ---------- API của khách ----------

export async function listMine(userId: number, query: NotificationListQuery) {
  const { items, total } = await notificationRepository.listByUser(userId, query.unread, query);
  return { items, meta: buildMeta(total, query) };
}

export function countUnread(userId: number) {
  return notificationRepository.countUnread(userId);
}

export async function markRead(userId: number, id: number) {
  if (!(await notificationRepository.markRead(userId, id))) {
    throw AppError.notFound('Không tìm thấy thông báo');
  }
}

export function markAllRead(userId: number) {
  return notificationRepository.markAllRead(userId, new Date());
}
