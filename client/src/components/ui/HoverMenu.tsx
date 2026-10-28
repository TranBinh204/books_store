'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './HoverMenu.module.css';

/** Chờ trước khi đóng khi chuột rời (đủ để chuột đi từ icon xuống hộp) */
const CLOSE_DELAY_MS = 180;

/** Thiết bị có chuột (rê được) — màn cảm ứng không có hover */
const canHover = () => window.matchMedia('(hover: hover)').matches;

/**
 * Hộp thả xuống dưới icon trên Header: desktop rê chuột là mở, cảm ứng / bàn phím bấm icon để mở.
 * Đóng: rời chuột · Esc · bấm ra ngoài. Không dùng Modal của MUI nên không khoá cuộn trang.
 * `trigger` nhận `toggle` để gắn vào nút; `children` nhận `close` để gắn vào link bên trong.
 */
export function HoverMenu({
  open,
  onOpenChange,
  trigger,
  children,
  panelClassName = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: { toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  panelClassName?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const close = () => onOpenChange(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    // Header ẩn khi cuộn xuống — hiện lại để hộp có chỗ bám
    document.body.classList.remove('scroll-down');
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onOpenChange(false);
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open, onOpenChange]);

  const hover = (hovering: boolean) => {
    if (!canHover()) return;
    clearTimeout(timer.current);
    if (hovering) onOpenChange(true);
    else timer.current = setTimeout(() => onOpenChange(false), CLOSE_DELAY_MS);
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onMouseEnter={() => hover(true)}
      onMouseLeave={() => hover(false)}
    >
      {trigger({ toggle: () => onOpenChange(!open) })}
      {open && (
        <div className={styles.drop}>
          <div className={`panel ${styles.pop} ${panelClassName}`}>{children(close)}</div>
        </div>
      )}
    </div>
  );
}
