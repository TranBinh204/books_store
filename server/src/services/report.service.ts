import * as dashboardRepository from '../repositories/dashboard.repository';
import type { DashboardRangeQuery, ReportType } from '../schemas/dashboard.schema';
import type { OrderStatus, PaymentMethod } from '../schemas/order.schema';
import type { PaymentStatus } from '../types/order.types';
import { toCsv } from '../utils/csv';
import { resolveRange, toTimeRange, type DayRange } from './dashboard.service';

// Xuất báo cáo CSV (M14 quy tắc 10)

/** Số dòng tối đa của báo cáo danh sách đơn */
export const ORDER_EXPORT_LIMIT = 10_000;

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã huỷ',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

const METHOD_LABELS: Record<PaymentMethod, string> = { COD: 'COD', VNPAY: 'VNPay' };

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
/** "02/09/2026 09:00" (giờ VN) — ghép theo từng phần, không phụ thuộc thứ tự mặc định của locale */
const formatDateTime = (date: Date) => {
  const p = Object.fromEntries(
    dateTimeFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
};
/** "2026-10-01" → "01/10/2026" */
const formatDay = (day: string) => day.split('-').reverse().join('/');

async function revenueReport(range: DayRange) {
  const rows = await dashboardRepository.chart(range.from, range.to, toTimeRange(range), 'day');
  return toCsv(
    ['Ngày', 'Số đơn', 'Doanh thu', 'Giảm giá voucher'],
    rows.map((row) => [formatDay(row.date), row.orders, row.revenue, row.voucherDiscount]),
  );
}

async function ordersReport(range: DayRange) {
  const rows = await dashboardRepository.ordersForExport(toTimeRange(range), ORDER_EXPORT_LIMIT);
  return toCsv(
    [
      'Mã đơn',
      'Ngày đặt',
      'Khách hàng',
      'Email',
      'SĐT người nhận',
      'Trạng thái',
      'Phương thức',
      'Thanh toán',
      'Số sản phẩm',
      'Tạm tính',
      'Giảm giá',
      'Mã voucher',
      'Tổng tiền',
      'Tính doanh thu',
    ],
    rows.map((row) => [
      row.code,
      formatDateTime(row.createdAt),
      row.customerName,
      row.email,
      row.recipientPhone,
      STATUS_LABELS[row.status],
      METHOD_LABELS[row.paymentMethod],
      PAYMENT_STATUS_LABELS[row.paymentStatus],
      row.itemCount,
      row.subtotal,
      row.discountAmount,
      row.voucherCode,
      row.total,
      row.counted ? 'Có' : 'Không',
    ]),
  );
}

async function topBooksReport(range: DayRange) {
  const rows = await dashboardRepository.topBooks(toTimeRange(range), null);
  return toCsv(
    ['Hạng', 'Mã sách', 'Tên sách', 'Số cuốn', 'Doanh thu'],
    rows.map((row, index) => [index + 1, row.bookId, row.title, row.quantity, row.revenue]),
  );
}

const BUILDERS: Record<ReportType, (range: DayRange) => Promise<string>> = {
  revenue: revenueReport,
  orders: ordersReport,
  'top-books': topBooksReport,
};

/** Nội dung CSV + tên file `bookstore-<loại>-<từ>_<đến>.csv` */
export async function buildReport(type: ReportType, query: DashboardRangeQuery) {
  const range = resolveRange(query);
  return {
    filename: `bookstore-${type}-${range.from}_${range.to}.csv`,
    content: await BUILDERS[type](range),
  };
}
