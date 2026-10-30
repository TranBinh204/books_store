import type { Request, Response } from 'express';
import type { VnpParams } from '../lib/vnpay';
import { isPaymentMethodAvailable } from '../services/order.service';
import * as paymentService from '../services/payment.service';
import { PAYMENT_METHODS } from '../schemas/order.schema';
import { sendSuccess } from '../utils/response';

// Thanh toán VNPay (M07) — docs/03-modules/07-payment.md mục 5

/** Query VNPay gửi về → chỉ giữ giá trị chuỗi (bỏ tham số lặp / lồng) */
function vnpParams(req: Request): VnpParams {
  return Object.fromEntries(
    Object.entries(req.query).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/** GET /api/payments/methods — phương thức đang nhận (VNPay tắt khi chưa cấu hình) */
export async function methods(_req: Request, res: Response) {
  return sendSuccess(
    res,
    PAYMENT_METHODS.map((code) => ({ code, available: isPaymentMethodAvailable(code) })),
  );
}

/** POST /api/me/orders/:id/vnpay — tạo lượt thử + link thanh toán */
export async function createVnpayPayment(req: Request, res: Response) {
  const { id } = req.params as unknown as { id: number };
  return sendSuccess(res, await paymentService.createVnpayPayment(req.user!.id, id, req.ip));
}

/** GET /api/payments/vnpay/ipn — VNPay gọi; luôn HTTP 200 + { RspCode, Message } */
export async function vnpayIpn(req: Request, res: Response) {
  return res.status(200).json(await paymentService.handleIpn(vnpParams(req)));
}

/** GET /api/payments/vnpay/return — trang kết quả gửi nguyên query VNPay trả về */
export async function vnpayReturn(req: Request, res: Response) {
  return sendSuccess(res, await paymentService.readReturn(vnpParams(req)));
}
