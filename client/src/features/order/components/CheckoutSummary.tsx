'use client';

import type { ReactNode } from 'react';
import { BookCover } from '@/components/shop/BookCover';
import type { Cart } from '@/features/cart';
import { formatPrice } from '@/lib/format';
import styles from './CheckoutSummary.module.css';

interface CheckoutSummaryProps {
  cart: Cart;
  /** Ô mã giảm giá (M11) */
  voucherSlot: ReactNode;
  /** Mã đang áp dụng & số tiền giảm — null khi chưa có mã hợp lệ */
  discount: { code: string; amount: number } | null;
}

/**
 * Phiếu đơn hàng trên giấy da (cột phải trang thanh toán): sách (bìa có chấm số lượng) · ô mã
 * giảm giá · tạm tính · giảm giá · vận chuyển · tổng cộng.
 */
export function CheckoutSummary({ cart, voucherSlot, discount }: CheckoutSummaryProps) {
  const total = cart.subtotal - (discount?.amount ?? 0);
  return (
    <section className="parchment">
      <div className="paper" aria-hidden="true" />
      <div className={`content ${styles.inner}`}>
        <h2>Đơn hàng của bạn</h2>
        <ul className={styles.items}>
          {cart.items.map((item) => (
            <li key={item.bookId}>
              <span className={`corners ${styles.cover}`}>
                <BookCover url={item.coverUrl} alt={item.title} sizes="56px" />
                <b className={styles.qty}>{item.quantity}</b>
              </span>
              <span className={styles.title}>{item.title}</span>
              <span className={styles.price}>{formatPrice(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        {voucherSlot}

        <dl>
          <div>
            <dt>Tạm tính</dt>
            <dd>{formatPrice(cart.subtotal)}</dd>
          </div>
          {discount && (
            <div>
              <dt>Giảm giá ({discount.code})</dt>
              <dd className={styles.good}>−{formatPrice(discount.amount)}</dd>
            </div>
          )}
          <div>
            <dt>Phí vận chuyển</dt>
            <dd className={styles.good}>Miễn phí</dd>
          </div>
          <div className={styles.total}>
            <dt>Tổng cộng</dt>
            <dd>{formatPrice(total)}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
