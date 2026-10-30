import type { Metadata } from 'next';
import { AddressBook } from '@/features/profile';

export const metadata: Metadata = { title: 'Sổ địa chỉ' };

export default function AddressBookPage() {
  return <AddressBook />;
}
