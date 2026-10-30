import type { OrderDetail } from '../../types/order.types';
import type { MailOptions } from '../mailer';
import { emailLayout, escapeHtml, money } from './shared';

export type ShippingStatus = 'CONFIRMED' | 'SHIPPING' | 'DELIVERED';

const COPY: Record<ShippingStatus, { subject: string; line: string; button: string }> = {
  CONFIRMED: {
    subject: 'đã được xác nhận',
    line: 'đã được cửa hàng xác nhận và đang được chuẩn bị.',
    button: 'Xem đơn hàng',
  },
  SHIPPING: {
    subject: 'đang được giao',
    line: 'đã được giao cho đơn vị vận chuyển và đang trên đường tới bạn.',
    button: 'Xem đơn hàng',
  },
  DELIVERED: {
    subject: 'đã giao thành công',
    line: 'đã được giao thành công. Cảm ơn bạn đã mua sắm tại BookStore! Hãy đánh giá sách để giúp người mua khác nhé.',
    button: 'Đánh giá ngay',
  },
};

/** Đơn đổi trạng thái: Đã xác nhận · Đang giao · Đã giao (M13 Q1) */
export function orderStatusEmail(data: {
  to: string;
  fullName: string;
  order: OrderDetail;
  status: ShippingStatus;
  orderUrl: string;
}): MailOptions {
  const { order } = data;
  const copy = COPY[data.status];
  return {
    to: data.to,
    subject: `BookStore – Đơn hàng ${order.code} ${copy.subject}`,
    text: [
      `Xin chào ${data.fullName},`,
      '',
      `Đơn hàng ${order.code} (${money(order.total)}) ${copy.line}`,
      `Giao tới: ${order.recipientName} – ${order.recipientPhone}, ${order.shippingAddress}`,
      '',
      `${copy.button}: ${data.orderUrl}`,
    ].join('\n'),
    html: emailLayout(
      `<p>Xin chào <strong>${escapeHtml(data.fullName)}</strong>,</p>
  <p>Đơn hàng <strong>${order.code}</strong> (${money(order.total)}) ${escapeHtml(copy.line)}</p>
  <p style="color:#757575">Giao tới: ${escapeHtml(order.recipientName)} – ${escapeHtml(
    order.recipientPhone,
  )}, ${escapeHtml(order.shippingAddress)}</p>`,
      { url: data.orderUrl, label: copy.button },
    ),
  };
}
