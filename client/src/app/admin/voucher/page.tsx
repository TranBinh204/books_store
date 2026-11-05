import type { Metadata } from 'next';
import { VoucherList } from '@/features/admin/vouchers';

export const metadata: Metadata = { title: 'Voucher' };

export default function AdminVouchersPage() {
  return <VoucherList />;
}
