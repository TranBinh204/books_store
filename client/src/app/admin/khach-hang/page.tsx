import type { Metadata } from 'next';
import { CustomerList } from '@/features/admin/customers';

export const metadata: Metadata = { title: 'Khách hàng' };

export default function AdminCustomersPage() {
  return <CustomerList />;
}
