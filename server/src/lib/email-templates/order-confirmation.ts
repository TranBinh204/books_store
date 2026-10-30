import type { OrderDetail } from '../../types/order.types';
import type { MailOptions } from '../mailer';
import { escapeHtml, money } from './shared';

interface OrderConfirmationData {
  to: string;
  fullName: string;
  order: OrderDetail;
  orderUrl: string;
}

const PAYMENT_LABELS: Record<OrderDetail['paymentMethod'], string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  VNPAY: 'VNPay',
};

/** VNPay đã trả tiền → ghi rõ trong email (M07 — email VNPay gửi khi IPN thành công) */
const paymentLabel = (order: OrderDetail) =>
  PAYMENT_LABELS[order.paymentMethod] + (order.paymentStatus === 'PAID' ? ' — đã thanh toán' : '');

/** Email xác nhận đặt hàng thành công (M06 Q4) */
export function orderConfirmationEmail({
  to,
  fullName,
  order,
  orderUrl,
}: OrderConfirmationData): MailOptions {
  const rows = order.items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.title)} × ${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${money(item.lineTotal)}</td>
    </tr>`,
    )
    .join('');

  // Voucher (M11)
  const discountLabel = `Giảm giá${order.voucherCode ? ` (${order.voucherCode})` : ''}`;
  const discountRow =
    order.discountAmount > 0
      ? `
    <tr>
      <td style="padding:8px 0 0">${escapeHtml(discountLabel)}</td>
      <td style="padding:8px 0 0;text-align:right;white-space:nowrap">−${money(order.discountAmount)}</td>
    </tr>`
      : '';

  return {
    to,
    subject: `BookStore – Xác nhận đơn hàng ${order.code}`,
    text: [
      `Xin chào ${fullName},`,
      '',
      `Cảm ơn bạn đã đặt hàng tại BookStore. Mã đơn: ${order.code}`,
      '',
      ...order.items.map((item) => `- ${item.title} × ${item.quantity}: ${money(item.lineTotal)}`),
      '',
      ...(order.discountAmount > 0 ? [`${discountLabel}: −${money(order.discountAmount)}`] : []),
      `Tổng cộng: ${money(order.total)} (miễn phí vận chuyển)`,
      `Thanh toán: ${paymentLabel(order)}`,
      `Giao đến: ${order.recipientName} – ${order.recipientPhone} – ${order.shippingAddress}`,
      '',
      `Xem đơn hàng: ${orderUrl}`,
    ].join('\n'),
    html: `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#212121">
  <h2 style="color:#ff8a3d">BookStore</h2>
  <p>Xin chào <strong>${escapeHtml(fullName)}</strong>,</p>
  <p>Cảm ơn bạn đã đặt hàng. Đơn <strong>${order.code}</strong> đã được ghi nhận và đang chờ xác nhận.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}${discountRow}
    <tr>
      <td style="padding:12px 0 0;font-weight:bold">Tổng cộng (miễn phí vận chuyển)</td>
      <td style="padding:12px 0 0;text-align:right;font-weight:bold;color:#e3161e">${money(order.total)}</td>
    </tr>
  </table>
  <p><strong>Thanh toán:</strong> ${paymentLabel(order)}</p>
  <p><strong>Giao đến:</strong> ${escapeHtml(order.recipientName)} – ${escapeHtml(order.recipientPhone)}<br>
     ${escapeHtml(order.shippingAddress)}</p>
  <p style="margin:24px 0">
    <a href="${orderUrl}"
       style="background:#ff8a3d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
      Xem đơn hàng
    </a>
  </p>
</div>`,
  };
}
