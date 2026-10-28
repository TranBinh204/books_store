import Link from 'next/link';
import { IconLogoBook } from '@/components/ui/icons';
import styles from './Logo.module.css';

/**
 * Logo chữ "BookStore" (font Grenze Gotisch, vàng phát sáng) + cuốn sách có ngôi sao — demo 07.
 * `plain`: chỉ chữ, không icon (footer).
 */
export function Logo({ plain = false }: { plain?: boolean }) {
  return (
    <Link
      href="/"
      className={`${styles.logo} ${plain ? styles.plain : ''}`}
      aria-label="BookStore – Trang chủ"
    >
      <IconLogoBook />
      BookStore
    </Link>
  );
}
