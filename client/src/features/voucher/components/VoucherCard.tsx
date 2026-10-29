'use client';

import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { voucherCondition, voucherTitle } from '../format';
import type { PublicVoucher } from '../types';
import styles from './VoucherCard.module.css';

const dayMonth = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
});

/**
 * Voucher dạng "cuộn bùa" (components.md 2.12, demo 07): tờ giấy da giữa 2 trục gỗ,
 * tiêu đề "Giảm 30K", điều kiện, mã, hạn; bấm dấu sáp "Lưu mã" → chép mã + nứt dấu + đổi xanh.
 */
export function VoucherCard({ voucher }: { voucher: PublicVoucher }) {
  const { enqueueSnackbar } = useSnackbar();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      enqueueSnackbar(`Đã lưu mã ${voucher.code} — dán ở bước thanh toán`, { variant: 'success' });
    } catch {
      enqueueSnackbar('Không sao chép được — hãy chọn và sao chép mã thủ công', {
        variant: 'warning',
      });
    }
  };

  return (
    <div className={styles.scroll}>
      <div className={styles.sheet}>
        <b className={styles.title}>{voucherTitle(voucher)}</b>
        <p className={styles.desc}>{voucher.description || voucherCondition(voucher)}</p>
        <code className={styles.code}>{voucher.code}</code>
        <small className={styles.exp}>
          Hiệu lực đến {dayMonth.format(new Date(voucher.endAt))}
        </small>
      </div>
      <span className={`${styles.rod} ${styles.top}`} aria-hidden="true" />
      <span className={`${styles.rod} ${styles.bot}`} aria-hidden="true" />
      <button
        type="button"
        onClick={copy}
        className={`${styles.wax} ${copied ? styles.copied : ''}`}
        aria-label={`Lưu mã ${voucher.code}`}
      >
        {copied ? (
          'Đã lưu'
        ) : (
          <>
            Lưu
            <br />
            mã
          </>
        )}
      </button>
    </div>
  );
}
