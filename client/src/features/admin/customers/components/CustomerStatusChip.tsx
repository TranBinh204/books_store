import { AdminTag } from '@/components/ui/AdminTag';

export function CustomerStatusChip({ isActive }: { isActive: boolean }) {
  return <AdminTag tone={isActive ? 'ok' : 'bad'}>{isActive ? 'Hoạt động' : 'Đã khoá'}</AdminTag>;
}
