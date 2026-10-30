import type { OrderDetail } from '../../types/order.types';
import type { MailOptions } from '../mailer';
import { emailLayout, escapeHtml, money } from './shared';

/** Cửa hàng đã hoàn tiền đơn bị huỷ — M08 Q4 */
export function orderRefundedEmail(data: {
  to: string;
  fullName: string;
  order: OrderDetail;
  orderUrl: string;
}): MailOptions {
  const { order } = data;
  return {
    to: data.to,
    subject: `BookStore – Đã hoàn tiền đơn hàng ${order.code}`,
    text: [
      `Xin chào ${data.fullName},`,
      '',
      `Cửa hàng đã hoàn ${money(order.total)} cho đơn hàng ${order.code} (đã huỷ).`,
      'Tuỳ ngân hàng, tiền có thể mất vài ngày làm việc để về tài khoản của bạn.',
      '',
      `Xem đơn hàng: ${data.orderUrl}`,
    ].join('\n'),
    html: emailLayout(
      `<p>Xin chào <strong>${escapeHtml(data.fullName)}</strong>,</p>
  <p>Cửa hàng đã hoàn <strong>${money(order.total)}</strong> cho đơn hàng <strong>${order.code}</strong> (đã huỷ).</p>
  <p>Tuỳ ngân hàng, tiền có thể mất vài ngày làm việc để về tài khoản của bạn.</p>`,
      { url: data.orderUrl, label: 'Xem đơn hàng' },
    ),
  };
}
