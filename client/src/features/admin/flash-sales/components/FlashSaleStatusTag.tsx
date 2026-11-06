import { AdminTag } from '@/components/ui/AdminTag';
import { FLASH_SALE_STATUS_TAG, type FlashSaleStatus } from '../types';

export function FlashSaleStatusTag({ status }: { status: FlashSaleStatus }) {
  const { label, tone } = FLASH_SALE_STATUS_TAG[status];
  return <AdminTag tone={tone}>{label}</AdminTag>;
}
