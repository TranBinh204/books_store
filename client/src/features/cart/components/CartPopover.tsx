'use client';

import { ClickAwayListener, Popper } from '@mui/material';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { useEffect, type CSSProperties } from 'react';
import { BookCover } from '@/components/shop/BookCover';
import { formatPrice } from '@/lib/format';
import { errorMessage } from '@/lib/form';
import { useCart, useRemoveFromCart } from '../hooks/useCart';
import { CART_PATH, useCheckout } from '../hooks/useCartUi';
import { useCartPopover } from '../store/cart-popover.store';
import cartStyles from './Cart.module.css';
import { FlashSaleLabel, TrashIcon, issueMessage } from './CartLine';
import styles from './CartPopover.module.css';

interface CartPopoverProps {
  /** Nút icon giỏ trên Header — hộp thả xuống bám vào đây */
  anchorEl: HTMLElement | null;
  /** Rê chuột vào / ra hộp (desktop) để không đóng khi chuột đi từ icon xuống hộp */
  onHoverChange: (hovering: boolean) => void;
}

/**
 * Giỏ hàng nhanh — hộp thả xuống dưới icon giỏ trên Header: desktop rê chuột là mở,
 * mobile chạm icon; cũng tự mở khi vừa thêm sách. Đóng: click ra ngoài / Esc / rời chuột.
 */
export function CartPopover({ anchorEl, onHoverChange }: CartPopoverProps) {
  const { enqueueSnackbar } = useSnackbar();
  const { open, setOpen } = useCartPopover();
  const { mode, cart, isPending } = useCart();
  const remove = useRemoveFromCart();
  const checkout = useCheckout();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    // Header ẩn khi cuộn xuống — hiện lại để hộp thả xuống có chỗ bám
    document.body.classList.remove('scroll-down');
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  return (
    <Popper
      open={open && !!anchorEl}
      anchorEl={anchorEl}
      placement="bottom-end"
      className={styles.popper}
      modifiers={[
        { name: 'offset', options: { offset: [0, 12] } },
        { name: 'preventOverflow', options: { padding: 12 } },
      ]}
    >
      <ClickAwayListener
        onClickAway={(event) => {
          // Bấm chính icon giỏ do nút tự xử lý (tránh vừa đóng vừa mở lại)
          if (!anchorEl?.contains(event.target as Node)) close();
        }}
      >
        <div
          className={`panel ${styles.pop}`}
          role="dialog"
          aria-label="Giỏ hàng nhanh"
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
        >
          <div className={styles.head}>
            <span>Hành trang ({cart.totalQuantity})</span>
            <button type="button" className="ic" onClick={close} aria-label="Đóng giỏ hàng">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {mode === 'admin' ? (
            <p className={styles.note}>Tài khoản quản trị không thể mua hàng.</p>
          ) : isPending ? (
            <div className={styles.list} aria-busy="true">
              {[0, 1, 2].map((index) => (
                <div key={index} className="o-skel" style={{ height: 56, margin: '13px 0' }} />
              ))}
            </div>
          ) : cart.items.length === 0 ? (
            <div className={styles.center}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M3 4h2l2.4 11h10.2L20 7H6.2M9 20h.01M17 20h.01" />
              </svg>
              <p>Túi hành trang còn trống</p>
              <Link href="/" className="btn btn-ghost btn-sm" onClick={close}>
                Tiếp tục mua sắm
              </Link>
            </div>
          ) : (
            <>
              <ul className={styles.list}>
                {cart.items.map((item) => {
                  const warning = issueMessage(item);
                  const blocked = item.issue === 'UNAVAILABLE' || item.issue === 'OUT_OF_STOCK';
                  return (
                    <li key={item.bookId} className={styles.item}>
                      <Link
                        href={`/sach/${item.bookId}`}
                        onClick={close}
                        className={`${cartStyles.cover} corners`}
                        style={{ '--cover': '56px' } as CSSProperties}
                        data-blocked={blocked}
                      >
                        <BookCover url={item.coverUrl} alt={item.title} sizes="56px" />
                      </Link>
                      <div>
                        <Link
                          href={`/sach/${item.bookId}`}
                          onClick={close}
                          className={`${cartStyles.name} ${styles.name}`}
                        >
                          {item.title}
                        </Link>
                        <div className={styles.line}>
                          {item.flashSale && <FlashSaleLabel />}
                          <span>
                            {item.quantity} × <b>{formatPrice(item.price)}</b>
                          </span>
                        </div>
                        {warning && <p className={cartStyles.warn}>{warning}</p>}
                      </div>
                      <button
                        type="button"
                        className={`ic ${cartStyles.remove}`}
                        onClick={() =>
                          remove.mutate(item.bookId, {
                            onError: (error) =>
                              enqueueSnackbar(errorMessage(error), { variant: 'error' }),
                          })
                        }
                        disabled={remove.isPending}
                        aria-label={`Xoá ${item.title}`}
                      >
                        <TrashIcon />
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className={styles.foot}>
                <div className={styles.sum}>
                  <span>Tạm tính</span>
                  <b>{formatPrice(cart.subtotal)}</b>
                </div>
                <div className={styles.actions}>
                  <Link href={CART_PATH} className="btn btn-ghost" onClick={close}>
                    Xem giỏ hàng
                  </Link>
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={checkout}
                    disabled={cart.hasIssues}
                  >
                    Thanh toán
                  </button>
                </div>
                {cart.hasIssues && (
                  <p className={styles.hint}>Có sản phẩm cần xử lý — mở giỏ hàng để cập nhật.</p>
                )}
              </div>
            </>
          )}
        </div>
      </ClickAwayListener>
    </Popper>
  );
}
