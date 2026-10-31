import { AdminTag, type AdminTagTone } from '@/components/ui/AdminTag';
import { formatDateTime, formatPrice } from '@/lib/format';
import { PAYMENT_METHOD_SHORT } from '../labels';
import type { PaymentRecord } from '../types';

const STATUS_TAG: Record<PaymentRecord['status'], { label: string; tone: AdminTagTone }> = {
  PENDING: { label: 'Đang chờ', tone: 'warn' },
  SUCCESS: { label: 'Thành công', tone: 'ok' },
  FAILED: { label: 'Thất bại', tone: 'bad' },
};

/** Các lượt thanh toán của đơn (bảng payments) — mới nhất trước */
export function PaymentAttemptTable({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) {
    return <p className="text-[15px] text-bone-2">Chưa có lượt thanh toán nào.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="a-table min-w-[560px]">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Mã giao dịch</th>
            <th>Số tiền</th>
            <th>Kết quả</th>
            <th>Ngân hàng / Mã VNPay</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className="align-top">
              <td className="whitespace-nowrap">{formatDateTime(payment.createdAt)}</td>
              <td>
                <b>{PAYMENT_METHOD_SHORT[payment.method]}</b>
                {payment.txnRef && <div className="text-sm text-bone-2">{payment.txnRef}</div>}
              </td>
              <td className="whitespace-nowrap">{formatPrice(payment.amount)}</td>
              <td>
                <AdminTag tone={STATUS_TAG[payment.status].tone}>
                  {STATUS_TAG[payment.status].label}
                </AdminTag>
                {payment.responseCode && (
                  <div className="mt-1 text-sm text-bone-2">
                    Mã {payment.responseCode}
                    {payment.responseMessage ? ` · ${payment.responseMessage}` : ''}
                  </div>
                )}
              </td>
              <td className="text-sm text-bone-2">
                {[payment.bankCode, payment.providerTxnNo].filter(Boolean).join(' · ') || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
