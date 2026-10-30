'use client';

import type { ReactNode } from 'react';
import { usePaymentMethods } from '@/features/payment';
import type { PaymentMethod } from '../types';
import { ChoiceCard } from './ChoiceCard';
import styles from './CheckoutChoices.module.css';

const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4 };

const METHODS: { value: PaymentMethod; label: string; description: string; icon: ReactNode }[] = [
  {
    value: 'COD',
    label: 'Thanh toán khi giao hàng (COD)',
    description: 'Trả tiền mặt cho nhân viên giao hàng khi nhận sách',
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="6" width="18" height="12" rx="1.5" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6.5 9.5v.01M17.5 14.5v.01" />
      </svg>
    ),
  },
  {
    value: 'VNPAY',
    label: 'Thanh toán qua VNPay',
    description: 'Thẻ ATM nội địa, thẻ quốc tế, quét mã QR',
    icon: (
      <svg {...svgProps}>
        <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
        <path d="M14 14h2.5v2.5H14zM18 18h2v2h-2zM18 14v.01M14 19v.01" />
      </svg>
    ),
  },
];

/** COD luôn có; VNPay chỉ mở khi server đã cấu hình (GET /api/payments/methods — M07) */
export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  const methods = usePaymentMethods();
  const isAvailable = (method: PaymentMethod) =>
    method === 'COD' || methods.data?.some((m) => m.code === method && m.available) === true;

  return (
    <div className={styles.list} role="radiogroup" aria-label="Phương thức thanh toán">
      {METHODS.map(({ value: method, label, description, icon }) => {
        const available = isAvailable(method);
        return (
          <ChoiceCard
            key={method}
            name="payment"
            checked={method === value}
            disabled={!available}
            onChange={() => onChange(method)}
          >
            <span className={styles.row}>
              {icon}
              <span>
                <span className={styles.name}>{label}</span>
                <span className={styles.desc}>{description}</span>
              </span>
              {!available && !methods.isPending && <span className={styles.off}>Tạm ngưng</span>}
            </span>
          </ChoiceCard>
        );
      })}
    </div>
  );
}
