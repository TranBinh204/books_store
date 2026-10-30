import type { OrderDetail } from '../../types/order.types';
import type { MailOptions } from '../mailer';
import { emailLayout, escapeHtml, money } from './shared';

/** Job tự huỷ đơn VNPay quá hạn thanh toán (M07 quy tắc 9 · M13 Q1) */
export function orderExpiredEmail(data: {
  to: string;
  fullName: string;
  order: OrderDetail;
  shopUrl: string;
}): MailOptions {
  const { order } = data;
  return {
    to: data.to,
    subject: `BookStore – Đơn hàng ${order.code} đã bị huỷ do quá hạn thanh toán`,
    text: [
      `Xin chào ${data.fullName},`,
      '',
      `Đơn hàng ${order.code} (${money(order.total)}) chưa được thanh toán qua VNPay trong thời hạn nên đã tự huỷ.`,
      'Bạn có thể đặt lại đơn hàng bất cứ lúc nào.',
      '',
      `Tiếp tục mua sắm: ${data.shopUrl}`,
    ].join('\n'),
    html: emailLayout(
      `<p>Xin chào <strong>${escapeHtml(data.fullName)}</strong>,</p>
  <p>Đơn hàng <strong>${order.code}</strong> (${money(order.total)}) chưa được thanh toán qua VNPay trong thời hạn nên đã tự huỷ.</p>
  <p>Bạn có thể đặt lại đơn hàng bất cứ lúc nào.</p>`,
      { url: data.shopUrl, label: 'Tiếp tục mua sắm' },
    ),
  };
}
