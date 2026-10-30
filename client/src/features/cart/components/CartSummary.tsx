'use client';

import Link from 'next/link';
import { formatPrice } from '@/lib/format';
import { useCheckout } from '../hooks/useCartUi';
import type { Cart } from '../types';
import styles from './CartSummary.module.css';

/** "Thông tin đơn hàng" — phiếu trên giấy da (cột phải trang giỏ hàng, dính khi cuộn ở desktop) */
export function CartSummary({ cart }: { cart: Cart }) {
  const checkout = useCheckout();
  const validCount = cart.items
    .filter((item) => item.issue === null)
    .reduce((sum, item) => sum + item.quantity, 0);
  const disabled = cart.items.length === 0 || cart.hasIssues;

  return (
    <section className="parchment">
      <div className="paper" aria-hidden="true" />
      <div className={`content ${styles.inner}`}>
        <h2>Thông tin đơn hàng</h2>
        <dl>
          <div>
            <dt>Tạm tính ({validCount} sản phẩm)</dt>
            <dd>{formatPrice(cart.subtotal)}</dd>
          </div>
          <div>
            <dt>Phí vận chuyển</dt>
            <dd className={styles.free}>Miễn phí</dd>
          </div>
          <div className={styles.total}>
            <dt>Tổng tiền</dt>
            <dd>{formatPrice(cart.subtotal)}</dd>
          </div>
        </dl>
        <p className={styles.note}>Bạn có thể nhập mã giảm giá ở trang thanh toán.</p>
        {cart.hasIssues && (
          <p className={styles.issue}>
            Giỏ hàng có sản phẩm cần xử lý (hết hàng / ngừng kinh doanh / vượt tồn kho) trước khi
            thanh toán.
          </p>
        )}
        <button type="button" className="btn btn-gold" onClick={checkout} disabled={disabled}>
          Thanh toán
        </button>
        <Link href="/" className={styles.back}>
          ← Tiếp tục mua sắm
        </Link>
      </div>
    </section>
  );
}
