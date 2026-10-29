'use client';

import { useEffect } from 'react';
import { formatPrice } from '@/lib/format';
import styles from './BookDetail.module.css';

/** Chiều cao thanh (px) — khớp `.buybar` trong ui.css; nút lên đầu trang nhích lên theo */
const BAR_HEIGHT = 64;

/**
 * Thanh mua dính đáy màn hình (chỉ ≤ 640px, CSS ẩn ở màn rộng): giá + nút "Thêm vào giỏ".
 * `show` = khối nút mua chính đã cuộn khỏi màn hình.
 */
export function StickyBuyBar({
  show,
  title,
  price,
  pending,
  onAdd,
}: {
  show: boolean;
  title: string;
  price: number;
  pending: boolean;
  onAdd: () => void;
}) {
  useEffect(() => {
    const body = document.body;
    body.style.setProperty('--buybar-h', show ? `${BAR_HEIGHT}px` : '0px');
    return () => {
      body.style.removeProperty('--buybar-h');
    };
  }, [show]);

  return (
    <div className={`buybar ${styles.buybarOn}`} data-show={show} aria-hidden={!show}>
      <div className="buybar-price">
        <b>{formatPrice(price)}</b>
        <small>{title}</small>
      </div>
      <button
        type="button"
        className="btn btn-gold"
        onClick={onAdd}
        disabled={pending}
        aria-busy={pending}
        tabIndex={show ? 0 : -1}
      >
        Thêm vào giỏ
      </button>
    </div>
  );
}
