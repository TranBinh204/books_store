'use client';

import { Alert } from '@mui/material';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/form';
import { formatPrice } from '@/lib/format';
import { useAdminFlashSale } from '../hooks/useAdminFlashSales';
import { FlashSaleForm } from './FlashSaleForm';
import { FlashSaleStatusTag } from './FlashSaleStatusTag';

const BACK = { href: '/admin/flash-sale', label: 'Danh sách Flash Sale' };

/** Trang sửa chương trình /admin/flash-sale/[id] */
export function FlashSaleEditPage({ id }: { id: number }) {
  const { data: sale, isPending, isError, error } = useAdminFlashSale(id);

  return (
    <>
      <PageHeader
        title={sale ? sale.name : 'Sửa chương trình'}
        back={BACK}
        description={
          sale && (
            <>
              <FlashSaleStatusTag status={sale.status} /> đã bán {sale.totalSold}/
              {sale.totalQuantity} suất · doanh thu {formatPrice(sale.revenue)}
            </>
          )
        }
      />
      {isPending && <Spinner fill />}
      {isError && <Alert severity="error">{errorMessage(error)}</Alert>}
      {sale && <FlashSaleForm sale={sale} />}
    </>
  );
}

/** Trang thêm chương trình /admin/flash-sale/moi */
export function FlashSaleCreatePage() {
  return (
    <>
      <PageHeader title="Thêm chương trình Flash Sale" back={BACK} />
      <FlashSaleForm sale={null} />
    </>
  );
}
