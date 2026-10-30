import { env } from '../config/env';
import type { Queryable } from '../db/pool';
import { withTransaction } from '../db/transaction';
import { orderCancelledEmail } from '../lib/email-templates/order-cancelled';
import { orderConfirmationEmail } from '../lib/email-templates/order-confirmation';
import { orderExpiredEmail } from '../lib/email-templates/order-expired';
import { orderStatusEmail, type ShippingStatus } from '../lib/email-templates/order-status';
import { orderRefundedEmail } from '../lib/email-templates/order-refunded';
import { sendMail, type MailOptions } from '../lib/mailer';
import { responseMessage } from '../lib/vnpay';
import * as addressRepository from '../repositories/address.repository';
import * as bookRepository from '../repositories/book.repository';
import * as cartRepository from '../repositories/cart.repository';
import * as inventoryLogRepository from '../repositories/inventory-log.repository';
import * as orderRepository from '../repositories/order.repository';
import * as paymentRepository from '../repositories/payment.repository';
import * as userRepository from '../repositories/user.repository';
import * as flashSaleService from './flash-sale.service';
import * as notificationService from './notification.service';
import * as voucherService from './voucher.service';
import type {
  AdminCancelOrderInput,
  AdminOrderListQuery,
  ChangeOrderStatusInput,
} from '../schemas/admin-order.schema';
import type {
  CreateOrderInput,
  OrderListQuery,
  OrderStatus,
  PaymentMethod,
} from '../schemas/order.schema';
import type { AdminOrderDetail, OrderDetail } from '../types/order.types';
import { AppError, type ErrorDetail } from '../utils/AppError';
import { isUniqueViolation } from '../utils/dbError';
import { vietnamDateRange } from '../utils/date';
import { buildMeta } from '../utils/pagination';
import { escapeLike } from '../utils/sql';

// Đặt hàng (F11) — docs/03-modules/06-order.md mục 3 · luồng tạo đơn: architecture.md 8.1

function orderNotFound() {
  return AppError.notFound('Không tìm thấy đơn hàng');
}

async function getOwned(userId: number, id: number): Promise<OrderDetail> {
  const order = await orderRepository.findOwned(userId, id);
  if (!order) throw orderNotFound();
  return order;
}

export const getOrder = getOwned;

export async function listOrders(userId: number, query: OrderListQuery) {
  const { items, total } = await orderRepository.listByUser(userId, query.status, query);
  return { items, meta: buildMeta(total, query) };
}

export function countOrders(userId: number) {
  return orderRepository.countByStatus(userId);
}

/** COD luôn nhận; VNPay chỉ khi đã cấu hình mã website + khoá bí mật (M07) */
export function isPaymentMethodAvailable(method: PaymentMethod): boolean {
  return method === 'COD' || env.vnpayEnabled;
}

/**
 * Gửi email xác nhận — không chờ, lỗi chỉ ghi log (đơn đã tạo thành công).
 * COD: lúc đặt · VNPay: khi IPN báo thanh toán thành công (M07 quy tắc 12)
 */
export function sendConfirmationEmail(userId: number, order: OrderDetail) {
  sendOrderEmail(userId, order, 'xác nhận', (user) =>
    orderConfirmationEmail({ ...user, order, orderUrl: orderUrl(order) }),
  );
}

const orderUrl = (order: OrderDetail) => `${env.CLIENT_URL}/tai-khoan/don-hang/${order.id}`;

/** Gửi email về đơn cho chủ đơn — không chờ, lỗi chỉ ghi log */
function sendOrderEmail(
  userId: number,
  order: OrderDetail,
  label: string,
  build: (user: { to: string; fullName: string }) => MailOptions,
) {
  void userRepository
    .findById(userId)
    .then((user) =>
      user ? sendMail(build({ to: user.email, fullName: user.fullName })) : undefined,
    )
    .catch((err) => console.error(`Gửi email ${label} đơn ${order.code} thất bại:`, err));
}

/**
 * Tạo đơn từ TOÀN BỘ giỏ hàng (quy tắc 2–8). Gửi lại cùng `idempotencyKey` → trả đúng đơn đã tạo.
 * Trả `created: false` khi đơn đã tồn tại (controller trả 200 thay vì 201).
 */
export async function createOrder(
  userId: number,
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<{ order: OrderDetail; created: boolean }> {
  const existingId = await orderRepository.findIdByIdempotencyKey(userId, idempotencyKey);
  if (existingId !== null) return { order: await getOwned(userId, existingId), created: false };

  if (!isPaymentMethodAvailable(input.paymentMethod)) {
    throw new AppError(
      400,
      'PAYMENT_METHOD_UNAVAILABLE',
      'Phương thức thanh toán này chưa được hỗ trợ',
    );
  }
  const address = await addressRepository.findOwned(userId, input.addressId);
  if (!address) throw AppError.notFound('Không tìm thấy địa chỉ giao hàng');

  let result: { id: number; created: boolean };
  try {
    result = await withTransaction(async (client) => {
      // Khoá giỏ (không cho sửa giỏ giữa chừng) rồi khoá các dòng sách theo thứ tự id
      await cartRepository.lockUser(userId, client);
      // Lượt gửi trùng khoá chạy song song: chờ khoá xong thì lượt trước đã tạo đơn → trả đơn đó
      const duplicateId = await orderRepository.findIdByIdempotencyKey(
        userId,
        idempotencyKey,
        client,
      );
      if (duplicateId !== null) return { id: duplicateId, created: false };

      const lines = await cartRepository.listByUser(userId, client);
      if (lines.length === 0) throw new AppError(400, 'CART_EMPTY', 'Giỏ hàng đang trống');

      const books = new Map(
        (
          await bookRepository.lockForOrder(
            lines.map((line) => line.bookId),
            client,
          )
        ).map((b) => [b.id, b]),
      );

      if (lines.some((line) => !books.get(line.bookId)?.isAvailable)) {
        throw new AppError(
          400,
          'CART_HAS_ISSUES',
          'Giỏ hàng có sản phẩm đã ngừng kinh doanh — vui lòng kiểm tra lại giỏ hàng',
        );
      }
      const shortages: ErrorDetail[] = lines
        .filter((line) => books.get(line.bookId)!.stock < line.quantity)
        .map((line) => {
          const book = books.get(line.bookId)!;
          return {
            field: `items.${line.bookId}`,
            message:
              book.stock > 0
                ? `"${book.title}" chỉ còn ${book.stock} sản phẩm`
                : `"${book.title}" đã hết hàng`,
          };
        });
      if (shortages.length > 0) {
        throw new AppError(
          409,
          'OUT_OF_STOCK',
          'Một số sản phẩm không đủ hàng — vui lòng cập nhật giỏ hàng',
          shortages,
        );
      }

      // Flash Sale (M12 quy tắc 5): khoá dòng suất SAU khi khoá sách, đọc lại suất & lượt / người
      const flashRows = lines.flatMap((line) => {
        const flash = books.get(line.bookId)!.flashSale;
        return flash ? [flash] : [];
      });
      const lockedFlash = await flashSaleService.lockForOrder(flashRows, client);
      const bought = await flashSaleService.countBoughtByUser(
        userId,
        [...lockedFlash.keys()],
        client,
      );

      // Giá do server tính từ giá hiện tại (giá sale nếu dòng được áp — chụp lại vào đơn)
      const limitIssues: ErrorDetail[] = [];
      const items = lines.map((line) => {
        const book = books.get(line.bookId)!;
        const flash = book.flashSale ? lockedFlash.get(book.flashSale.itemId) : undefined;
        const pricing = flashSaleService.priceLine(
          flash ? { ...flash, itemId: flash.id } : null,
          book.price,
          line.quantity,
          flash ? (bought.get(flash.id) ?? 0) : 0,
        );
        if (pricing.limitExceeded) {
          limitIssues.push({
            field: `items.${book.id}`,
            message: `"${book.title}" chỉ được mua tối đa ${pricing.allowed} cuốn giá Flash Sale`,
          });
        }
        return {
          bookId: book.id,
          title: book.title,
          image: book.coverUrl,
          unitPrice: pricing.unitPrice,
          quantity: line.quantity,
          flashSaleItemId: pricing.flashSaleItemId,
        };
      });
      if (limitIssues.length > 0) {
        throw new AppError(
          409,
          'FLASH_SALE_LIMIT',
          'Một số sản phẩm vượt giới hạn mua giá Flash Sale — vui lòng cập nhật giỏ hàng',
          limitIssues,
        );
      }
      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      // Voucher (M11): khoá dòng mã & kiểm tra lại điều kiện — sau khi khoá sách (cùng thứ tự với huỷ đơn)
      const voucher = input.voucherCode
        ? await voucherService.lockForOrder(input.voucherCode, userId, subtotal, client)
        : null;
      const discountAmount = voucher?.discountAmount ?? 0;
      const total = subtotal - discountAmount; // miễn phí vận chuyển
      if (total !== input.expectedTotal) {
        throw new AppError(
          409,
          'PRICE_CHANGED',
          'Giá sản phẩm đã thay đổi — vui lòng kiểm tra lại đơn hàng',
        );
      }

      const code = await orderRepository.nextOrderCode(client);
      const id = await orderRepository.insert(
        {
          code,
          userId,
          idempotencyKey,
          paymentMethod: input.paymentMethod,
          recipientName: address.recipientName,
          recipientPhone: address.phone,
          shippingAddress: `${address.detail}, ${address.ward}, ${address.province}`,
          note: input.note,
          subtotal,
          discountAmount,
          voucherId: voucher?.voucherId ?? null,
          total,
          // VNPay: giữ hàng tới hạn thanh toán (M07 quy tắc 2)
          paymentTtlMinutes: input.paymentMethod === 'VNPAY' ? env.VNPAY_PAYMENT_TTL_MINUTES : null,
        },
        client,
      );
      await orderRepository.insertItems(id, items, client);
      for (const item of items) {
        if (item.flashSaleItemId !== null) {
          await flashSaleService.addSold(item.flashSaleItemId, item.quantity, client);
        }
      }
      if (voucher) {
        await voucherService.useForOrder(
          { voucherId: voucher.voucherId, userId, orderId: id },
          client,
        );
      }
      await orderRepository.insertHistory(
        id,
        { from: null, to: 'PENDING', changedBy: userId, note: 'Đặt hàng' },
        client,
      );
      await notificationService.notifyOrder('ORDER_PLACED', id, client);
      for (const item of items) {
        const stockAfter = await bookRepository.applyOrderQuantity(
          item.bookId,
          item.quantity,
          client,
        );
        await inventoryLogRepository.insert(
          {
            bookId: item.bookId,
            change: -item.quantity,
            stockAfter,
            reason: 'ORDER',
            orderId: id,
            note: `Đơn ${code}`,
          },
          client,
        );
      }
      await cartRepository.removeBooks(
        userId,
        items.map((item) => item.bookId),
        client,
      );
      return { id, created: true };
    });
  } catch (err) {
    // 2 lượt gửi cùng khoá chạy song song → lượt sau vấp UNIQUE → trả đơn của lượt trước
    if (isUniqueViolation(err, 'orders_user_id_idempotency_key_key')) {
      const id = await orderRepository.findIdByIdempotencyKey(userId, idempotencyKey);
      if (id !== null) return { order: await getOwned(userId, id), created: false };
    }
    throw err;
  }

  const order = await getOwned(userId, result.id);
  if (result.created && order.paymentMethod === 'COD') sendConfirmationEmail(userId, order);
  return { order, created: result.created };
}

/**
 * Huỷ đơn (đã khoá dòng đơn) → hoàn tồn kho + log CANCEL, trừ số đã bán, ghi lịch sử.
 * Dùng chung: KH huỷ, job huỷ đơn quá hạn thanh toán (M07), Admin huỷ (M08).
 */
async function cancelAndRestock(
  order: OrderDetail,
  event: { reason: string; changedBy: number | null; note: string },
  client: Queryable,
) {
  await orderRepository.markCancelled(order.id, event.reason, client);
  await orderRepository.insertHistory(
    order.id,
    { from: order.status, to: 'CANCELLED', changedBy: event.changedBy, note: event.note },
    client,
  );
  // Khoá sách theo thứ tự id trước khi hoàn tồn (cùng thứ tự với tạo đơn)
  await bookRepository.lockForOrder(
    order.items.map((item) => item.bookId),
    client,
  );
  for (const item of order.items) {
    const stockAfter = await bookRepository.applyOrderQuantity(item.bookId, -item.quantity, client);
    await inventoryLogRepository.insert(
      {
        bookId: item.bookId,
        change: item.quantity,
        stockAfter,
        reason: 'CANCEL',
        orderId: order.id,
        note: `Huỷ đơn ${order.code}`,
      },
      client,
    );
  }
  // Trả suất Flash Sale (M12 quy tắc 7) — sau khi khoá sách, cùng thứ tự khoá với tạo đơn
  await flashSaleService.releaseForOrder(order.id, client);
  // Trả lượt dùng mã giảm giá (M11 quy tắc 8)
  await voucherService.releaseForOrder(order.id, client);
}

/** KH huỷ đơn khi còn PENDING và chưa thanh toán (M07 quy tắc 11) — 1 transaction */
export async function cancelOrder(
  userId: number,
  id: number,
  reason: string,
): Promise<OrderDetail> {
  await withTransaction(async (client) => {
    const order = await orderRepository.findOwned(userId, id, client, true);
    if (!order) throw orderNotFound();
    if (order.status !== 'PENDING') {
      throw new AppError(
        400,
        'ORDER_NOT_CANCELLABLE',
        'Chỉ huỷ được đơn đang chờ xác nhận — vui lòng liên hệ cửa hàng',
      );
    }
    if (order.paymentStatus === 'PAID') {
      throw new AppError(
        400,
        'ORDER_NOT_CANCELLABLE',
        'Đơn hàng đã được thanh toán — vui lòng liên hệ cửa hàng để huỷ và hoàn tiền',
      );
    }
    await cancelAndRestock(
      order,
      { reason, changedBy: userId, note: `Khách huỷ: ${reason}` },
      client,
    );
    await notificationService.notifyOrder('ORDER_CANCELLED', id, client, { byCustomer: true });
  });
  return getOwned(userId, id);
}

/** Số đơn huỷ mỗi transaction của job hết hạn */
const EXPIRE_BATCH_SIZE = 20;

/**
 * Tự huỷ đơn VNPay chưa thanh toán đã quá hạn + thời gian chờ IPN muộn (M07 quy tắc 9).
 * Gọi định kỳ bởi jobs/expire-unpaid-orders.ts. Trả số đơn đã huỷ.
 */
export async function expireUnpaidOrders(): Promise<number> {
  let total = 0;
  for (;;) {
    const expired = await withTransaction(async (client) => {
      const ids = await orderRepository.lockOverdueUnpaid(
        env.VNPAY_CANCEL_GRACE_MINUTES,
        EXPIRE_BATCH_SIZE,
        client,
      );
      const result: { id: number; userId: number }[] = [];
      for (const id of ids) {
        const order = (await orderRepository.findById(id, client))!;
        await cancelAndRestock(
          order,
          {
            reason: 'Quá hạn thanh toán',
            changedBy: null,
            note: 'Tự huỷ: quá hạn thanh toán VNPay',
          },
          client,
        );
        await notificationService.notifyOrder('ORDER_EXPIRED', id, client);
        result.push({ id, userId: (await orderRepository.findPayable(id, client))!.userId });
      }
      return result;
    });
    // Email sau khi đã COMMIT (M13 Q1)
    for (const { id, userId } of expired) {
      const order = await orderRepository.findById(id);
      if (order) {
        sendOrderEmail(userId, order, 'huỷ quá hạn', (user) =>
          orderExpiredEmail({ ...user, order, shopUrl: env.CLIENT_URL }),
        );
      }
    }
    total += expired.length;
    if (expired.length < EXPIRE_BATCH_SIZE) return total;
  }
}

// ---------- Admin xử lý đơn (M08) — docs/03-modules/08-admin-customer-order.md mục 3.1 ----------

/** Bước kế tiếp hợp lệ (quy tắc 2): đi từng bước, không nhảy, không lùi */
const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'SHIPPING',
  SHIPPING: 'DELIVERED',
};

/** Admin huỷ được (SHIPPING = giao thất bại — Q1) */
const ADMIN_CANCELLABLE: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPING'];

function invalidTransition() {
  return new AppError(400, 'INVALID_STATUS_TRANSITION', 'Không thể chuyển đơn sang trạng thái này');
}

/** Khoá dòng đơn & kiểm tra trạng thái Admin đang thấy vẫn đúng (quy tắc 8) */
async function lockForAdmin(id: number, expectedStatus: OrderStatus | null, client: Queryable) {
  const order = await orderRepository.findPayable(id, client, true);
  if (!order) throw orderNotFound();
  if (expectedStatus !== null && order.status !== expectedStatus) {
    throw new AppError(
      409,
      'ORDER_STATUS_CHANGED',
      'Đơn hàng vừa được cập nhật — vui lòng tải lại trang',
    );
  }
  return order;
}

export async function listForAdmin(query: AdminOrderListQuery) {
  const range = vietnamDateRange(query.from, query.to);
  const { items, total } = await orderRepository.listForAdmin(
    {
      status: query.status,
      needsRefund: query.needsRefund,
      paymentMethod: query.paymentMethod,
      paymentStatus: query.paymentStatus,
      from: range.from,
      to: range.to,
      userId: query.userId,
      keyword: query.q ? escapeLike(query.q) : undefined,
      sort: query.sort,
    },
    query,
  );
  return { items, meta: buildMeta(total, query) };
}

export function countForAdmin() {
  return orderRepository.countForAdmin();
}

export async function getForAdmin(id: number): Promise<AdminOrderDetail> {
  const order = await orderRepository.findForAdmin(id);
  if (!order) throw orderNotFound();
  const payments = await paymentRepository.listByOrder(id);
  return {
    ...order,
    payments: payments.map((payment) => ({
      ...payment,
      responseMessage:
        payment.method === 'VNPAY' && payment.responseCode
          ? responseMessage(payment.responseCode)
          : null,
    })),
  };
}

/**
 * Xác nhận / Bắt đầu giao / Đã giao (quy tắc 2–4, 8, 9).
 * Đơn COD giao xong → đã thanh toán + ghi 1 dòng payments COD SUCCESS.
 */
export async function changeStatus(
  adminId: number,
  id: number,
  input: ChangeOrderStatusInput,
): Promise<AdminOrderDetail> {
  const userId = await withTransaction(async (client) => {
    const order = await lockForAdmin(id, input.expectedStatus, client);
    if (NEXT_STATUS[order.status] !== input.status) throw invalidTransition();
    if (
      input.status === 'CONFIRMED' &&
      order.paymentMethod === 'VNPAY' &&
      order.paymentStatus !== 'PAID'
    ) {
      throw new AppError(
        400,
        'PAYMENT_REQUIRED',
        'Đơn VNPay chưa được thanh toán — chờ khách thanh toán hoặc huỷ đơn',
      );
    }

    await orderRepository.setStatus(id, input.status, client);
    await orderRepository.insertHistory(
      id,
      { from: order.status, to: input.status, changedBy: adminId, note: input.note },
      client,
    );

    if (
      input.status === 'DELIVERED' &&
      order.paymentMethod === 'COD' &&
      order.paymentStatus !== 'PAID'
    ) {
      const paidAt = new Date();
      await orderRepository.markPaid(id, paidAt, client);
      await paymentRepository.insert(
        {
          orderId: id,
          method: 'COD',
          amount: order.total,
          txnRef: null,
          expiresAt: null,
          status: 'SUCCESS',
          paidAt,
        },
        client,
      );
    }
    // Thông báo trong web (M13) — email gửi sau khi commit
    await notificationService.notifyOrder(`ORDER_${input.status as ShippingStatus}`, id, client);
    return order.userId;
  });

  const order = (await orderRepository.findById(id))!;
  sendOrderEmail(userId, order, 'đổi trạng thái', (user) =>
    orderStatusEmail({
      ...user,
      order,
      status: input.status as ShippingStatus,
      orderUrl: orderUrl(order),
    }),
  );
  return getForAdmin(id);
}

/** Admin huỷ đơn (quy tắc 5, 6): hoàn kho; đơn đã trả tiền → Cần hoàn tiền. Gửi email cho khách */
export async function adminCancel(
  adminId: number,
  id: number,
  input: AdminCancelOrderInput,
): Promise<AdminOrderDetail> {
  const userId = await withTransaction(async (client) => {
    const order = await lockForAdmin(id, input.expectedStatus, client);
    if (!ADMIN_CANCELLABLE.includes(order.status)) throw invalidTransition();
    const detail = (await orderRepository.findById(id, client))!;
    await cancelAndRestock(
      detail,
      { reason: input.reason, changedBy: adminId, note: `Cửa hàng huỷ: ${input.reason}` },
      client,
    );
    await notificationService.notifyOrder('ORDER_CANCELLED', id, client, {
      reason: input.reason,
      paid: order.paymentStatus === 'PAID',
    });
    return order.userId;
  });

  const order = (await orderRepository.findById(id))!;
  sendOrderEmail(userId, order, 'huỷ', (user) =>
    orderCancelledEmail({ ...user, order, reason: input.reason, orderUrl: orderUrl(order) }),
  );
  return getForAdmin(id);
}

/** Xác nhận đã hoàn tiền thủ công (quy tắc 7) — chỉ đơn đã huỷ & đã nhận tiền */
export async function markRefunded(
  adminId: number,
  id: number,
  note: string,
): Promise<AdminOrderDetail> {
  const userId = await withTransaction(async (client) => {
    const order = await lockForAdmin(id, null, client);
    if (order.status !== 'CANCELLED' || order.paymentStatus !== 'PAID') {
      throw new AppError(
        400,
        'ORDER_NOT_REFUNDABLE',
        'Chỉ hoàn tiền cho đơn đã huỷ và đã được thanh toán',
      );
    }
    await orderRepository.markRefunded(id, client);
    await orderRepository.insertHistory(
      id,
      { from: 'CANCELLED', to: 'CANCELLED', changedBy: adminId, note: `Đã hoàn tiền: ${note}` },
      client,
    );
    await notificationService.notifyOrder('ORDER_REFUNDED', id, client);
    return order.userId;
  });

  const order = (await orderRepository.findById(id))!;
  sendOrderEmail(userId, order, 'hoàn tiền', (user) =>
    orderRefundedEmail({ ...user, order, orderUrl: orderUrl(order) }),
  );
  return getForAdmin(id);
}
