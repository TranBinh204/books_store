'use client';

import { useSnackbar } from 'notistack';
import { useState, type ReactNode } from 'react';
import { Breadcrumb } from '@/components/shop/Breadcrumb';
import { ListingEmpty } from '@/components/shop/ListingEmpty';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatPrice } from '@/lib/format';
import { errorMessage } from '@/lib/form';
import { useCart, useClearCart } from '../hooks/useCart';
import { useCheckout } from '../hooks/useCartUi';
import styles from './CartPage.module.css';
import { CartLine } from './CartLine';
import { CartSummary } from './CartSummary';

const SHOPPING_ACTION = { href: '/', label: 'Tiếp tục mua sắm', variant: 'gold' } as const;
const HOME_ACTION = { href: '/', label: 'Về trang chủ', variant: 'gold' } as const;

/** Trang /gio-hang (F10, M05 mục 4.2). `emptyExtra`: khối hiện dưới giỏ trống (vd Sách bán chạy) */
export function CartPage({ emptyExtra }: { emptyExtra?: ReactNode }) {
  const { enqueueSnackbar } = useSnackbar();
  const { mode, cart, isPending } = useCart();
  const clear = useClearCart();
  const checkout = useCheckout();
  const [confirmClear, setConfirmClear] = useState(false);

  const breadcrumb = <Breadcrumb items={[{ label: `Giỏ hàng (${cart.totalQuantity})` }]} />;
  const title = (subtitle?: ReactNode) => (
    <SectionTitle
      compact
      chapter="Giỏ hàng"
      title={
        <>
          Hành trang <em>của bạn</em>
        </>
      }
      subtitle={subtitle}
    />
  );

  if (mode === 'admin') {
    return (
      <div className={`wrap ${styles.page}`}>
        {breadcrumb}
        <div className={styles.empty}>
          <ListingEmpty message="Tài khoản quản trị không thể mua hàng." action={HOME_ACTION} />
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className={`wrap ${styles.page}`} aria-busy="true">
        {breadcrumb}
        {title()}
        <div className={styles.layout}>
          <div className={`surface ${styles.list}`}>
            {[0, 1, 2].map((index) => (
              <div key={index} className={`o-skel ${styles.skeleton}`} />
            ))}
          </div>
          <div className="o-skel" style={{ height: 300 }} />
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className={`wrap ${styles.page}`}>
        {breadcrumb}
        {title()}
        <div className={styles.empty}>
          <ListingEmpty
            message="Giỏ hàng của bạn đang trống. Hãy chọn thêm sách để mua nhé!"
            action={SHOPPING_ACTION}
          />
        </div>
        {emptyExtra}
      </div>
    );
  }

  const handleClear = () =>
    clear.mutate(undefined, {
      onSuccess: () => {
        setConfirmClear(false);
        enqueueSnackbar('Đã xoá toàn bộ giỏ hàng', { variant: 'success' });
      },
      onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
    });

  return (
    <div className={`wrap ${styles.page}`}>
      {breadcrumb}
      {title(
        <>
          Bạn đang có <strong>{cart.totalQuantity} sản phẩm</strong> trong giỏ hàng
        </>,
      )}
      <div className={styles.layout}>
        <section className={`surface ${styles.list}`}>
          <div className={styles.head}>
            <span>{cart.items.length} món</span>
            <button type="button" onClick={() => setConfirmClear(true)} className={styles.clear}>
              Xoá tất cả
            </button>
          </div>
          <ul>
            {cart.items.map((item) => (
              <CartLine key={item.bookId} item={item} />
            ))}
          </ul>
        </section>

        <aside className={styles.aside}>
          <CartSummary cart={cart} />
        </aside>
      </div>

      {/* Mobile: tổng tiền + Thanh toán dính đáy màn hình */}
      <div className={`buybar ${styles.barOn}`} data-show="true">
        <div className="buybar-price">
          <small>Tổng tiền</small>
          <b>{formatPrice(cart.subtotal)}</b>
        </div>
        <button type="button" className="btn btn-gold" onClick={checkout} disabled={cart.hasIssues}>
          Thanh toán
        </button>
      </div>

      <ConfirmModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        loading={clear.isPending}
        chapter="Giỏ hàng"
        title={
          <>
            Xoá toàn bộ <em>giỏ hàng</em>?
          </>
        }
        message={`${cart.items.length} sản phẩm sẽ bị xoá khỏi giỏ hàng.`}
        confirmText="Xoá tất cả"
        onConfirm={handleClear}
      />
    </div>
  );
}
