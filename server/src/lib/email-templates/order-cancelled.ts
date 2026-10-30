import type { OrderDetail } from '../../types/order.types';
import type { MailOptions } from '../mailer';
import { emailLayout, escapeHtml, money } from './shared';

/** Cửa hàng (Admin) huỷ đơn — M08 Q4. Đơn đã thanh toán → báo sẽ hoàn tiền */
export function orderCancelledEmail(data: {
  to: string;
  fullName: string;
  order: OrderDetail;
  reason: string;
  orderUrl: string;
}): MailOptions {
  const { order } = data;
  const paid = order.paymentStatus === 'PAID';
  const refundText = `Đơn hàng đã được thanh toán ${money(order.total)} — cửa hàng sẽ hoàn tiền cho bạn và liên hệ khi hoàn tất.`;

  return {
    to: data.to,
    subject: `BookStore – Đơn hàng ${order.code} đã bị huỷ`,
    text: [
      `Xin chào ${data.fullName},`,
      '',
      `Rất tiếc, đơn hàng ${order.code} đã được cửa hàng huỷ.`,
      `Lý do: ${data.reason}`,
      ...(paid ? ['', refundText] : []),
      '',
      'Nếu cần hỗ trợ, vui lòng liên hệ cửa hàng.',
      `Xem đơn hàng: ${data.orderUrl}`,
    ].join('\n'),
    html: emailLayout(
      `<p>Xin chào <strong>${escapeHtml(data.fullName)}</strong>,</p>
  <p>Rất tiếc, đơn hàng <strong>${order.code}</strong> đã được cửa hàng huỷ.</p>
  <p><strong>Lý do:</strong> ${escapeHtml(data.reason)}</p>
  ${paid ? `<p style="color:#e3161e">${refundText}</p>` : ''}
  <p>Nếu cần hỗ trợ, vui lòng liên hệ cửa hàng.</p>`,
      { url: data.orderUrl, label: 'Xem đơn hàng' },
    ),
  };
}
