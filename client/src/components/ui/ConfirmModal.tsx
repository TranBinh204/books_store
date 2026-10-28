'use client';

import type { ReactNode } from 'react';
import { Modal } from './Modal';
import styles from './ConfirmModal.module.css';

/**
 * Hộp xác nhận kiểu Dark Fantasy (xoá giỏ, xoá chat...) dựng trên Modal.
 * Admin vẫn dùng `ConfirmDialog` (MUI) trong khung sáng của họ.
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  chapter,
  title,
  message,
  cancelText = 'Giữ lại',
  confirmText = 'Xoá',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  chapter?: string;
  title: ReactNode;
  message: ReactNode;
  cancelText?: string;
  confirmText?: string;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!loading}
      size="sm"
      chapter={chapter}
      title={title}
    >
      <div className={styles.confirm}>
        <p>{message}</p>
        <div className={styles.actions}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            <span>{cancelText}</span>
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
          >
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
