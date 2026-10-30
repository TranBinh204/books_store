import { createHmac, timingSafeEqual } from 'node:crypto';

// VNPay 2.1.0 — dựng URL thanh toán, ký / kiểm tra chữ ký (HMAC-SHA512).
// Không phụ thuộc DB. Chi tiết: docs/04-integrations/vnpay-sandbox.md

export type VnpParams = Record<string, string>;

/** Mã hoá giống code mẫu Node.js của VNPay: encodeURIComponent, khoảng trắng → '+' */
const encode = (value: string) => encodeURIComponent(value).replace(/%20/g, '+');

/** Chuỗi để ký: tham số vnp_* có giá trị (trừ chữ ký), sắp xếp theo tên, nối key=value&... */
export function signData(params: VnpParams): string {
  return Object.keys(params)
    .filter(
      (key) =>
        key.startsWith('vnp_') &&
        key !== 'vnp_SecureHash' &&
        key !== 'vnp_SecureHashType' &&
        params[key] !== undefined &&
        params[key] !== '',
    )
    .sort()
    .map((key) => `${encode(key)}=${encode(params[key])}`)
    .join('&');
}

export function sign(params: VnpParams, secret: string): string {
  return createHmac('sha512', secret).update(signData(params), 'utf8').digest('hex');
}

/** Kiểm tra `vnp_SecureHash` (không phân biệt hoa thường, so sánh thời gian hằng) */
export function verify(params: VnpParams, secret: string): boolean {
  const received = Buffer.from(String(params.vnp_SecureHash ?? '').toLowerCase());
  const expected = Buffer.from(sign(params, secret));
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Thời điểm → `yyyyMMddHHmmss` theo giờ Việt Nam (GMT+7) */
export function formatVnpDate(date: Date): string {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${vn.getUTCFullYear()}${pad(vn.getUTCMonth() + 1)}${pad(vn.getUTCDate())}` +
    `${pad(vn.getUTCHours())}${pad(vn.getUTCMinutes())}${pad(vn.getUTCSeconds())}`
  );
}

/** IPv4 dạng IPv6 (`::ffff:1.2.3.4`) → `1.2.3.4` */
function normalizeIp(ip: string | undefined): string {
  if (!ip) return '127.0.0.1';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

export interface PaymentUrlInput {
  gatewayUrl: string;
  tmnCode: string;
  secret: string;
  returnUrl: string;
  txnRef: string;
  /** VND — VNPay yêu cầu nhân 100 */
  amount: number;
  /** Không dấu, không ký tự đặc biệt */
  orderInfo: string;
  ipAddr: string | undefined;
  createdAt: Date;
  expiresAt: Date;
}

export function buildPaymentUrl(input: PaymentUrlInput): string {
  const params: VnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: input.tmnCode,
    vnp_Amount: String(input.amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: input.txnRef,
    vnp_OrderInfo: input.orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: input.returnUrl,
    vnp_IpAddr: normalizeIp(input.ipAddr),
    vnp_CreateDate: formatVnpDate(input.createdAt),
    vnp_ExpireDate: formatVnpDate(input.expiresAt),
  };
  const query = signData(params);
  return `${input.gatewayUrl}?${query}&vnp_SecureHash=${sign(params, input.secret)}`;
}

/** Số tiền VNPay gửi về (×100) → VND; sai định dạng → NaN */
export function parseAmount(params: VnpParams): number {
  const raw = params.vnp_Amount;
  return raw && /^\d+$/.test(raw) ? Number(raw) / 100 : NaN;
}

/** Giao dịch thành công: cả mã phản hồi và trạng thái giao dịch đều '00' */
export function isSuccess(params: VnpParams): boolean {
  return params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
}

const RESPONSE_MESSAGES: Record<string, string> = {
  '00': 'Giao dịch thành công',
  '07': 'Trừ tiền thành công nhưng giao dịch bị nghi ngờ — cửa hàng sẽ kiểm tra và liên hệ bạn',
  '09': 'Thẻ / tài khoản chưa đăng ký dịch vụ Internet Banking',
  '10': 'Xác thực thông tin thẻ / tài khoản sai quá 3 lần',
  '11': 'Đã hết thời gian chờ thanh toán',
  '12': 'Thẻ / tài khoản đã bị khoá',
  '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP)',
  '24': 'Bạn đã huỷ giao dịch',
  '51': 'Tài khoản không đủ số dư',
  '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
  '75': 'Ngân hàng thanh toán đang bảo trì',
  '79': 'Nhập sai mật khẩu thanh toán quá số lần quy định',
};

/** Mã `vnp_ResponseCode` → câu tiếng Việt hiển thị cho khách */
export function responseMessage(code: string | undefined): string {
  return (code && RESPONSE_MESSAGES[code]) || 'Giao dịch không thành công, vui lòng thử lại';
}

/** Phản hồi IPN theo đặc tả VNPay */
export const IPN_RESPONSES = {
  success: { RspCode: '00', Message: 'Confirm Success' },
  notFound: { RspCode: '01', Message: 'Order not found' },
  alreadyConfirmed: { RspCode: '02', Message: 'Order already confirmed' },
  invalidAmount: { RspCode: '04', Message: 'Invalid amount' },
  invalidSignature: { RspCode: '97', Message: 'Invalid signature' },
  unknown: { RspCode: '99', Message: 'Unknown error' },
} as const;

export type IpnResponse = (typeof IPN_RESPONSES)[keyof typeof IPN_RESPONSES];
