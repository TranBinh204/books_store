import { AdminTag } from '@/components/ui/AdminTag';
import type { PaymentMethod, PaymentStatus } from '@/features/order';
import { PAYMENT_METHOD_SHORT, PAYMENT_STATUS_TAG } from '../labels';

/** "VNPay · Đã thanh toán" (tag màu) */
export function PaymentStatusChip({
  method,
  status,
}: {
  method?: PaymentMethod;
  status: PaymentStatus;
}) {
  const { label, tone } = PAYMENT_STATUS_TAG[status];
  return (
    <span className="inline-flex items-center gap-2">
      {method && <b className="text-bone">{PAYMENT_METHOD_SHORT[method]}</b>}
      <AdminTag tone={tone}>{label}</AdminTag>
    </span>
  );
}
