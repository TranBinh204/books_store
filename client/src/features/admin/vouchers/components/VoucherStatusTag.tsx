import { AdminTag } from '@/components/ui/AdminTag';
import { VOUCHER_STATUS_TAG, type VoucherStatus } from '../types';

export function VoucherStatusTag({ status }: { status: VoucherStatus }) {
  const { label, tone } = VOUCHER_STATUS_TAG[status];
  return <AdminTag tone={tone}>{label}</AdminTag>;
}
