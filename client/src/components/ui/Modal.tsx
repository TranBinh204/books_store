'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { liftTopLayer } from '@/hooks/useTopLayer';
import { IconClose } from './icons';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Nhãn chương nhỏ phía trên tiêu đề (`.orn` thu gọn) */
  chapter?: string;
  title: ReactNode;
  /** false → không đóng được bằng Esc / bấm nền / nút ✕ (đang gửi dữ liệu) */
  dismissible?: boolean;
  /** Hộp hẹp cho xác nhận ngắn */
  size?: 'md' | 'sm';
  children: ReactNode;
}

/**
 * Hộp thoại tối dùng thẻ `<dialog>` gốc: trình duyệt tự khoá focus, Esc đóng, trả focus khi đóng.
 * Mobile: trượt từ dưới lên (bottom sheet). Nội dung chỉ dựng khi mở.
 */
export function Modal({
  open,
  onClose,
  chapter,
  title,
  dismissible = true,
  size = 'md',
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Đũa phép + toast phải nằm trên hộp thoại (cùng lớp trên cùng)
      liftTopLayer();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${size === 'sm' ? styles.sm : ''}`}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        // Esc: tự đóng thì trạng thái `open` của cha lệch → để cha quyết định
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      {open && (
        <div className={`panel corners ${styles.card}`}>
          <header className={styles.head}>
            {chapter && <p className={styles.chapter}>{chapter}</p>}
            <h2 id="modal-title" className={styles.title}>
              {title}
            </h2>
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              disabled={!dismissible}
              aria-label="Đóng"
            >
              <IconClose width="18" height="18" />
            </button>
          </header>
          <div className={styles.scroll}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
