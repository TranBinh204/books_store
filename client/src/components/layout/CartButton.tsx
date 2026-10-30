'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CountBadge } from '@/components/ui/CountBadge';
import { IconBag } from '@/components/ui/icons';
import { CART_PATH, CartPopover, CartSync, useCartCount, useCartPopover } from '@/features/cart';

/** Chờ trước khi đóng khi chuột rời icon / hộp (đủ để chuột đi từ icon xuống hộp) */
const CLOSE_DELAY_MS = 180;

/** Thiết bị có chuột (rê được) — màn cảm ứng không có hover */
const canHover = () => window.matchMedia('(hover: hover)').matches;

/**
 * Icon giỏ hàng trên Header + badge đỏ (tổng số lượng). `data-cart-target`: đích bay tới của
 * hiệu ứng "sách bay vào giỏ". Desktop: rê chuột → hộp giỏ hàng nhanh thả xuống, bấm → trang giỏ hàng.
 * Cảm ứng: chạm → mở / đóng hộp. Kèm CartSync.
 */
export function CartButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const count = useCartCount();
  const { open, setOpen } = useCartPopover();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const hover = (hovering: boolean) => {
    if (!canHover()) return;
    clearTimeout(closeTimer.current);
    if (hovering) setOpen(true);
    else closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const handleClick = () => {
    if (!canHover()) return setOpen(!open);
    setOpen(false);
    router.push(CART_PATH);
  };

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={handleClick}
        onMouseEnter={() => hover(true)}
        onMouseLeave={() => hover(false)}
        className={className}
        data-cart-target
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Giỏ hàng: ${count} sản phẩm`}
      >
        <IconBag />
        <CountBadge count={count} />
      </button>
      <CartPopover anchorEl={anchor} onHoverChange={hover} />
      <CartSync />
    </>
  );
}
