'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { InventoryLogTable } from './InventoryLogTable';
import { StockImport } from './StockImport';
import { StockSummary } from './StockSummary';

/** Trang /admin/ton-kho: tình trạng kho + lịch sử biến động toàn cửa hàng */
export function InventoryPage() {
  return (
    <>
      <PageHeader
        title="Tồn kho"
        description="Mọi lần nhập hàng, điều chỉnh, bán và hoàn hàng. Điều chỉnh tồn kho ở trang sửa từng sách."
        actions={<StockImport />}
      />
      <StockSummary />
      <InventoryLogTable />
    </>
  );
}
