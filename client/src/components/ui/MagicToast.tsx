'use client';

import { SnackbarContent, type CustomContentProps } from 'notistack';
import { forwardRef } from 'react';
import styles from './MagicToast.module.css';

/**
 * Giao diện toast kiểu demo 07 cho notistack (components.md Q5): nền tối viền vàng,
 * ô vuông xoay 45° có ngôi sao (lỗi: ô đỏ có "!"). Nảy lên 380ms.
 */
export const MagicToast = forwardRef<HTMLDivElement, CustomContentProps>(function MagicToast(
  { id, message, variant, style, className },
  ref,
) {
  const tone = variant === 'error' ? styles.error : variant === 'warning' ? styles.warning : '';
  return (
    <SnackbarContent ref={ref} id={String(id)} style={style} className={className} role="alert">
      <div className={`${styles.toast} ${tone}`}>
        <span className={styles.ic} aria-hidden="true" />
        <span>{message}</span>
      </div>
    </SnackbarContent>
  );
});
