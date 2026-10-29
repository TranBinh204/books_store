'use client';

import { IconHeart } from '@/components/ui/icons';
import { burst } from '@/lib/burst';
import { useToggleWishlist } from '../hooks/useWishlist';
import styles from './WishlistButton.module.css';

/**
 * Nút ♡ (M09 mục 4.1, 4.2) — giao diện demo 07:
 * - `icon`: nút tròn góc trên phải bìa thẻ sách, hiện khi rê chuột vào thẻ (hoặc đã thích);
 *   bật thích → tim đỏ nảy + pháo hoa nhỏ
 * - `button`: nút viền "Yêu thích" ở trang chi tiết sách
 */
export function WishlistButton({
  bookId,
  variant = 'icon',
}: {
  bookId: number;
  variant?: 'icon' | 'button';
}) {
  const { toggle, isLiked } = useToggleWishlist();
  const liked = isLiked(bookId);
  const label = liked ? 'Bỏ yêu thích' : 'Thêm vào yêu thích';

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!liked) burst(event.currentTarget);
    toggle(bookId);
  };

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={liked}
        className={`btn btn-ghost ${styles.big}`}
      >
        <IconHeart />
        <span>{liked ? 'Đã yêu thích' : 'Yêu thích'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      aria-pressed={liked}
      className={styles.wish}
      data-wish
    >
      <IconHeart />
    </button>
  );
}
