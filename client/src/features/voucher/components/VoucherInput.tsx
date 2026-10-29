'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/format';
import styles from './VoucherInput.module.css';

interface VoucherInputProps {
  /** Mã đang áp dụng (null = chưa nhập) */
  code: string | null;
  checking: boolean;
  /** Số tiền giảm khi mã hợp lệ */
  discountAmount: number | null;
  /** Lý do mã không dùng được */
  error: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
}

/**
 * Ô "Mã giảm giá" + nút "Sử dụng" ở trang thanh toán (M11 mục 4.2), nằm trên phiếu giấy da.
 * Hợp lệ → chip mã (✕ để gỡ) + dòng "Đã áp dụng mã"; không hợp lệ → giữ ô & báo lý do.
 */
export function VoucherInput({
  code,
  checking,
  discountAmount,
  error,
  onApply,
  onRemove,
}: VoucherInputProps) {
  const [text, setText] = useState(code ?? '');
  const applied = code !== null && !checking && discountAmount !== null;
  const trimmed = text.trim();

  if (applied) {
    return (
      <div className={styles.box}>
        <span className={styles.chip}>
          {code}
          <button
            type="button"
            onClick={() => {
              setText('');
              onRemove();
            }}
            aria-label={`Gỡ mã ${code}`}
          >
            ✕
          </button>
        </span>
        <p className={styles.ok}>Đã áp dụng mã — giảm {formatPrice(discountAmount)}</p>
      </div>
    );
  }

  const submit = () => {
    if (trimmed && !checking) onApply(trimmed.toUpperCase());
  };
  const showError = !!error && !checking;

  return (
    <div className={styles.box}>
      <div className={styles.row}>
        <input
          className={`field field-parch ${styles.input}`}
          placeholder="Mã giảm giá"
          aria-label="Mã giảm giá"
          aria-invalid={showError}
          value={text}
          onChange={(event) => setText(event.target.value.slice(0, 50))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-ink"
          onClick={submit}
          disabled={!trimmed || checking}
          aria-busy={checking}
        >
          <span>Sử dụng</span>
        </button>
      </div>
      {showError && <p className={styles.error}>{error}</p>}
    </div>
  );
}
