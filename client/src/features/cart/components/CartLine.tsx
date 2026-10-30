'use client';

import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { BookCover } from '@/components/shop/BookCover';
import { QuantityInput } from '@/components/shop/QuantityInput';
import { formatPrice } from '@/lib/format';
import { errorMessage } from '@/lib/form';
import { useRemoveFromCart, useSetCartQuantity } from '../hooks/useCart';
import type { CartItem } from '../types';
import styles from './Cart.module.css';
import lineStyles from './CartLine.module.css';

/** Nhãn nhỏ cạnh giá dòng được giá Flash Sale */
export function FlashSaleLabel() {
  return <span className={styles.flash}>Flash Sale</span>;
}

/** Biểu tượng thùng rác nét mảnh (nút xoá dòng) */
export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
    </svg>
  );
}

/** Câu cảnh báo của dòng có vấn đề (dòng đó không tính vào tạm tính) */
export function issueMessage(item: CartItem) {
  switch (item.issue) {
    case 'UNAVAILABLE':
      return 'Sản phẩm đã ngừng kinh doanh — vui lòng xoá khỏi giỏ';
    case 'OUT_OF_STOCK':
      return 'Sản phẩm đã hết hàng — vui lòng xoá khỏi giỏ';
    case 'EXCEEDS_STOCK':
      return `Chỉ còn ${item.maxQuantity} sản phẩm`;
    case 'FLASH_SALE_LIMIT':
      return `Giá Flash Sale tối đa ${item.flashSale?.allowed ?? 1} cuốn / khách — vui lòng giảm số lượng`;
    default:
      return null;
  }
}

/** 1 dòng trang giỏ hàng: ảnh · tên · đơn giá · số lượng · thành tiền · xoá · cảnh báo */
export function CartLine({ item }: { item: CartItem }) {
  const { enqueueSnackbar } = useSnackbar();
  const setQuantity = useSetCartQuantity();
  const remove = useRemoveFromCart();
  const busy = setQuantity.isPending || remove.isPending;
  const href = `/sach/${item.bookId}`;
  const warning = issueMessage(item);
  const flashAllowed = item.flashSale?.allowed ?? 0;
  const blocked = item.issue === 'UNAVAILABLE' || item.issue === 'OUT_OF_STOCK';
  const onError = (error: unknown) => enqueueSnackbar(errorMessage(error), { variant: 'error' });

  const changeQuantity = (quantity: number) =>
    setQuantity.mutate({ bookId: item.bookId, quantity }, { onError });

  return (
    <li className={lineStyles.line} data-busy={busy}>
      <Link href={href} className={`${styles.cover} corners`} data-blocked={blocked}>
        <BookCover url={item.coverUrl} alt={item.title} sizes="96px" />
      </Link>

      <div className={lineStyles.info}>
        <Link href={href} className={styles.name}>
          {item.title}
        </Link>
        <div className={lineStyles.price}>
          {item.flashSale && <FlashSaleLabel />}
          <b>{formatPrice(item.price)}</b>
          {item.discountPercent > 0 && <s>{formatPrice(item.originalPrice)}</s>}
        </div>
        {warning && (
          <p className={styles.warn}>
            <span>{warning}</span>
            {item.issue === 'EXCEEDS_STOCK' && (
              <button
                type="button"
                onClick={() => changeQuantity(item.maxQuantity)}
                disabled={busy}
              >
                Cập nhật về {item.maxQuantity}
              </button>
            )}
            {item.issue === 'FLASH_SALE_LIMIT' && flashAllowed > 0 && (
              <button type="button" onClick={() => changeQuantity(flashAllowed)} disabled={busy}>
                Cập nhật về {flashAllowed}
              </button>
            )}
          </p>
        )}
      </div>

      <div className={lineStyles.ctrl}>
        {blocked ? (
          <span className={lineStyles.fixedQty}>Số lượng: {item.quantity}</span>
        ) : (
          <QuantityInput
            size="sm"
            value={item.quantity}
            max={Math.max(item.maxQuantity, item.quantity)}
            onChange={changeQuantity}
            disabled={busy}
          />
        )}
        <span className={lineStyles.total} data-issue={item.issue !== null}>
          {formatPrice(item.lineTotal)}
        </span>
      </div>

      <button
        type="button"
        className={`ic ${styles.remove} ${lineStyles.rm}`}
        onClick={() => remove.mutate(item.bookId, { onError })}
        disabled={busy}
        aria-label={`Xoá ${item.title} khỏi giỏ`}
        title="Xoá khỏi giỏ"
      >
        <TrashIcon />
      </button>
    </li>
  );
}
