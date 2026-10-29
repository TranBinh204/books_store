'use client';

import { useState } from 'react';
import { IconBagAdd } from '@/components/ui/icons';
import { flyToCart } from '@/lib/fly-to-cart';
import { useAddToCartWithFeedback } from '../hooks/useCartUi';

/** Nút xanh rêu "đã thêm" trong bao lâu — demo 07 */
const ADDED_MS = 1200;

/**
 * Nút "thêm vào giỏ" (components.md 2.12): bấm → ảnh bìa bay vào icon giỏ, icon giỏ lắc,
 * badge nảy, toast "Đã thêm “…” vào giỏ"; nút chuyển xanh rêu 1.2s.
 * Phần tử cha phải có `data-book` và ảnh bìa nằm trong `data-cover`.
 * - `diamond` (mặc định): nút thoi trên thẻ sách
 * - `ink`: nút chữ trên giấy da ("Thêm vào giỏ" — khối Truyền thuyết)
 * - `gold`: nút vàng cỡ nhỏ, chữ tuỳ ý (bục vinh danh "118.000₫ · Mua")
 */
export function AddToCartButton({
  bookId,
  title,
  disabled = false,
  variant = 'diamond',
  label,
  className = '',
}: {
  bookId: number;
  title: string;
  disabled?: boolean;
  variant?: 'diamond' | 'ink' | 'gold';
  label?: string;
  className?: string;
}) {
  const { addToCart, isPending } = useAddToCartWithFeedback();
  const [added, setAdded] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setAdded(true);
    window.setTimeout(() => setAdded(false), ADDED_MS);
    // Bay song song với gọi API — số trên badge đổi khi API xong
    void flyToCart(event.currentTarget);
    addToCart(bookId, 1, 'toast', title);
  };

  const common = {
    type: 'button' as const,
    onClick: handleClick,
    disabled: disabled || isPending,
    'data-wand-hover': true,
  };

  if (variant === 'ink') {
    return (
      <button {...common} className={`btn btn-ink ${added ? 'added' : ''} ${className}`}>
        {disabled ? 'Đã hết hàng' : added ? 'Đã thêm ✦' : (label ?? 'Thêm vào giỏ')}
      </button>
    );
  }
  if (variant === 'gold') {
    return (
      <button {...common} className={`btn btn-gold btn-sm ${className}`}>
        {disabled ? 'Đã hết hàng' : (label ?? 'Mua')}
      </button>
    );
  }
  return (
    <button
      {...common}
      className={`diamond ${added ? 'added' : ''} ${className}`}
      aria-label={disabled ? 'Đã hết hàng' : `Thêm “${title}” vào giỏ`}
    >
      <span>
        <IconBagAdd />
      </span>
    </button>
  );
}
