import { env } from '../config/env';
import { withTransaction } from '../db/transaction';
import * as vnpay from '../lib/vnpay';
import * as orderRepository from '../repositories/order.repository';
import * as paymentRepository from '../repositories/payment.repository';
import type { VnpayReturnResult } from '../types/payment.types';
import { AppError } from '../utils/AppError';
import * as notificationService from './notification.service';
import { sendConfirmationEmail } from './order.service';

// Thanh toán VNPay (F12) — docs/03-modules/07-payment.md mục 3 · docs/04-integrations/vnpay-sandbox.md

function log(message: string) {
  if (!env.isTest) console.log(`[VNPay] ${message}`);
}

/** Cảnh báo cần Admin xử lý (hoàn tiền) */
function warn(message: string) {
  if (!env.isTest) console.warn(`[VNPay] ⚠️  ${message}`);
}

function vnpayConfig() {
  if (!env.vnpayEnabled) {
    throw new AppError(
      400,
      'PAYMENT_METHOD_UNAVAILABLE',
      'Phương thức thanh toán này chưa được hỗ trợ',
    );
  }
  return { tmnCode: env.VNPAY_TMN_CODE!, secret: env.VNPAY_HASH_SECRET! };
}

/**
 * Tạo 1 lượt thử thanh toán + link VNPay cho đơn của chính KH (quy tắc 3).
 * Link hết hạn đúng bằng hạn thanh toán của đơn.
 */
export async function createVnpayPayment(
  userId: number,
  orderId: number,
  ipAddr: string | undefined,
): Promise<{ paymentUrl: string; expiresAt: Date }> {
  const { tmnCode, secret } = vnpayConfig();

  return withTransaction(async (client) => {
    // Khoá đơn: không cho tạo lượt thử song song (đánh số lượt thử) / chen với huỷ đơn
    const order = await orderRepository.findPayable(orderId, client, true);
    if (!order || order.userId !== userId) throw AppError.notFound('Không tìm thấy đơn hàng');
    if (
      order.paymentMethod !== 'VNPAY' ||
      order.status !== 'PENDING' ||
      order.paymentStatus === 'PAID' ||
      !order.paymentDueAt
    ) {
      throw new AppError(400, 'ORDER_NOT_PAYABLE', 'Đơn hàng này không cần thanh toán online');
    }
    const now = new Date();
    if (order.paymentDueAt <= now) {
      throw new AppError(
        400,
        'PAYMENT_EXPIRED',
        'Đơn hàng đã hết hạn thanh toán và sẽ được tự động huỷ',
      );
    }

    const attempt = (await paymentRepository.countByOrder(order.id, client)) + 1;
    const txnRef = `${order.code}-${attempt}`;
    await paymentRepository.insert(
      {
        orderId: order.id,
        method: 'VNPAY',
        amount: order.total,
        txnRef,
        expiresAt: order.paymentDueAt,
      },
      client,
    );

    const paymentUrl = vnpay.buildPaymentUrl({
      gatewayUrl: env.VNPAY_URL,
      tmnCode,
      secret,
      returnUrl: env.VNPAY_RETURN_URL,
      txnRef,
      amount: order.total,
      orderInfo: `Thanh toan don hang ${order.code}`,
      ipAddr,
      createdAt: now,
      expiresAt: order.paymentDueAt,
    });
    log(`Tạo link ${txnRef} (${order.total}đ)`);
    return { paymentUrl, expiresAt: order.paymentDueAt };
  });
}

/**
 * Xử lý IPN (quy tắc 6–10) — nguồn DUY NHẤT cập nhật trạng thái thanh toán.
 * Idempotent: lượt thử đã xử lý → '02', không cập nhật lại. Không bao giờ ném lỗi.
 */
export async function handleIpn(params: vnpay.VnpParams): Promise<vnpay.IpnResponse> {
  const txnRef = params.vnp_TxnRef ?? '';
  try {
    const result = await processIpn(params);
    log(`IPN ${txnRef} mã ${params.vnp_ResponseCode ?? '?'} → ${result.RspCode}`);
    return result;
  } catch (err) {
    console.error(`[VNPay] Lỗi xử lý IPN ${txnRef}:`, err);
    return vnpay.IPN_RESPONSES.unknown;
  }
}

async function processIpn(params: vnpay.VnpParams): Promise<vnpay.IpnResponse> {
  if (!env.vnpayEnabled || !vnpay.verify(params, env.VNPAY_HASH_SECRET!)) {
    return vnpay.IPN_RESPONSES.invalidSignature;
  }

  const outcome = await withTransaction(async (client) => {
    const payment = await paymentRepository.findByTxnRef(params.vnp_TxnRef ?? '', client, true);
    if (!payment) return { response: vnpay.IPN_RESPONSES.notFound };
    if (vnpay.parseAmount(params) !== payment.amount) {
      return { response: vnpay.IPN_RESPONSES.invalidAmount };
    }
    if (payment.status !== 'PENDING') return { response: vnpay.IPN_RESPONSES.alreadyConfirmed };

    // Khoá đơn sau lượt thử (cùng thứ tự ở mọi nơi) — chen với khách huỷ / job hết hạn
    const order = (await orderRepository.findPayable(payment.orderId, client, true))!;
    const success = vnpay.isSuccess(params);
    const paidAt = success ? new Date() : null;

    await paymentRepository.markResult(
      payment.id,
      {
        status: success ? 'SUCCESS' : 'FAILED',
        providerTxnNo: params.vnp_TransactionNo || null,
        bankCode: params.vnp_BankCode || null,
        responseCode: params.vnp_ResponseCode || null,
        rawData: params,
        paidAt,
      },
      client,
    );

    if (!success) {
      // Vẫn chờ thanh toán — khách thử lại được tới hết hạn (quy tắc 8)
      if (order.status === 'PENDING' && order.paymentStatus !== 'PAID') {
        await orderRepository.setPaymentStatus(order.id, 'FAILED', client);
        await notificationService.notifyOrder('PAYMENT_FAILED', order.id, client, {
          paymentId: payment.id,
        });
      }
      return { response: vnpay.IPN_RESPONSES.success };
    }

    if (order.paymentStatus === 'PAID') {
      // Đơn đã được trả bằng lượt thử khác → khách trả 2 lần, cần hoàn tiền thủ công
      warn(`Đơn ${order.code} đã thanh toán trước đó — ${payment.txnRef} cần hoàn tiền`);
      return { response: vnpay.IPN_RESPONSES.success };
    }

    await orderRepository.markPaid(order.id, paidAt!, client);
    const cancelled = order.status === 'CANCELLED';
    await orderRepository.insertHistory(
      order.id,
      {
        from: order.status,
        to: order.status,
        changedBy: null,
        note: cancelled
          ? `Nhận tiền VNPay sau khi đơn đã huỷ — cần hoàn tiền (mã GD ${params.vnp_TransactionNo})`
          : `Đã thanh toán VNPay (mã GD ${params.vnp_TransactionNo})`,
      },
      client,
    );
    if (cancelled) {
      // Quy tắc 10: Admin hoàn tiền thủ công (M08)
      warn(`Đơn ${order.code} đã huỷ nhưng nhận được tiền — cần hoàn tiền`);
    } else {
      await notificationService.notifyOrder('PAYMENT_SUCCESS', order.id, client);
    }
    return {
      response: vnpay.IPN_RESPONSES.success,
      paidOrder: cancelled ? null : { id: order.id, userId: order.userId },
    };
  });

  // Email xác nhận đơn VNPay gửi sau khi đã COMMIT (quy tắc 12)
  if ('paidOrder' in outcome && outcome.paidOrder) {
    const order = await orderRepository.findById(outcome.paidOrder.id);
    if (order) sendConfirmationEmail(outcome.paidOrder.userId, order);
  }
  return outcome.response;
}

/**
 * Trang kết quả (Return URL) — chỉ kiểm tra chữ ký & hiển thị, KHÔNG ghi DB (quy tắc 5).
 * Ngoại lệ chỉ dành cho dev: VNPAY_IPN_FROM_RETURN=true → xử lý như IPN (local không nhận IPN).
 */
export async function readReturn(params: vnpay.VnpParams): Promise<VnpayReturnResult> {
  if (!env.vnpayEnabled || !vnpay.verify(params, env.VNPAY_HASH_SECRET!)) {
    throw new AppError(422, 'INVALID_SIGNATURE', 'Không xác định được kết quả thanh toán');
  }
  if (env.VNPAY_IPN_FROM_RETURN) await handleIpn(params);

  const payment = await paymentRepository.findByTxnRef(params.vnp_TxnRef);
  const order = payment && (await orderRepository.findPayable(payment.orderId));
  if (!payment || !order) throw AppError.notFound('Không tìm thấy giao dịch');

  const success = vnpay.isSuccess(params);
  return {
    orderId: order.id,
    orderCode: order.code,
    success,
    responseCode: params.vnp_ResponseCode ?? null,
    message: vnpay.responseMessage(params.vnp_ResponseCode),
    amount: payment.amount,
    transactionNo: params.vnp_TransactionNo || null,
    paymentDueAt: order.paymentDueAt,
  };
}
