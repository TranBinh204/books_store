'use client';

import { useEffect, useRef, useState } from 'react';
import { QuantityInput } from '@/components/shop/QuantityInput';
import { IconBagAdd } from '@/components/ui/icons';
import { useAddToCartWithFeedback } from '@/features/cart';
import { WishlistButton } from '@/features/wishlist';
import styles from './BookDetail.module.css';
import { StickyBuyBar } from './StickyBuyBar';

/**
 * Chọn số lượng (− 1 +, tối đa = maxQuantity) · THÊM VÀO GIỎ (mở giỏ hàng nhanh)
 * · MUA NGAY (thêm vào giỏ rồi tới thẳng trang thanh toán — khách chưa đăng nhập: tới giỏ hàng)
 * · ♡ Yêu thích (M09 — có cả khi hết hàng). Mobile: thêm thanh mua dính đáy khi khối này khuất.
 */
export function BookPurchase({
  bookId,
  maxQuantity,
  title,
  price,
}: {
  bookId: number;
  maxQuantity: number;
  title: string;
  price: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, isPending } = useAddToCartWithFeedback();
  const actionsRef = useRef<HTMLDivElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);

  // Thanh dính chỉ hiện khi hàng nút mua đã cuộn khỏi phía trên màn hình
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) =>
      setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [maxQuantity]);

  if (maxQuantity <= 0) {
    return (
      <div className={styles.actions}>
        <button type="button" disabled className={`btn btn-ghost ${styles.soldOut}`}>
          Hết hàng
        </button>
        <WishlistButton bookId={bookId} variant="button" />
      </div>
    );
  }

  return (
    <div className={styles.buy}>
      <div className={styles.qtyRow}>
        <span>Số lượng</span>
        <QuantityInput value={quantity} max={maxQuantity} onChange={setQuantity} />
      </div>

      <div ref={actionsRef} className={styles.actions}>
        <button
          type="button"
          className="btn btn-gold"
          onClick={() => addToCart(bookId, quantity)}
          disabled={isPending}
          aria-busy={isPending}
        >
          <IconBagAdd /> Thêm vào giỏ
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => addToCart(bookId, quantity, 'checkout')}
          disabled={isPending}
          aria-busy={isPending}
        >
          Mua ngay
        </button>
        <WishlistButton bookId={bookId} variant="button" />
      </div>

      <StickyBuyBar
        show={scrolledPast}
        title={title}
        price={price}
        pending={isPending}
        onAdd={() => addToCart(bookId, quantity)}
      />
    </div>
  );
}
