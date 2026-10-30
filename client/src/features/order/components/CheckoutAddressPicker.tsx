'use client';

import { useState } from 'react';
import { AddressDialog, formatAddress, type Address } from '@/features/profile';
import { ChoiceCard } from './ChoiceCard';
import styles from './CheckoutChoices.module.css';

interface CheckoutAddressPickerProps {
  addresses: Address[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Bắt đầu thêm địa chỉ mới → trang thanh toán tự chọn địa chỉ vừa thêm */
  onAddStart: () => void;
}

/**
 * Chọn địa chỉ giao hàng từ sổ địa chỉ (thẻ chọn) + "Giao đến địa chỉ khác" (thêm vào sổ).
 * Địa chỉ mới thêm được trang thanh toán tự chọn (so danh sách id trước / sau).
 */
export function CheckoutAddressPicker({
  addresses,
  selectedId,
  onSelect,
  onAddStart,
}: CheckoutAddressPickerProps) {
  const [adding, setAdding] = useState(false);

  return (
    <div className={styles.list} role="radiogroup" aria-label="Địa chỉ giao hàng">
      {addresses.map((address) => (
        <ChoiceCard
          key={address.id}
          name="address"
          checked={address.id === selectedId}
          onChange={() => onSelect(address.id)}
        >
          <span className={styles.who}>
            <strong>{address.recipientName}</strong>
            <span>{address.phone}</span>
            {address.isDefault && <span className={styles.tag}>Mặc định</span>}
          </span>
          <span className={styles.addr}>{formatAddress(address)}</span>
        </ChoiceCard>
      ))}

      <button
        type="button"
        onClick={() => {
          onAddStart();
          setAdding(true);
        }}
        className={`btn btn-ghost btn-sm ${styles.add}`}
      >
        {addresses.length === 0 ? '+ Thêm địa chỉ giao hàng' : '+ Giao đến địa chỉ khác'}
      </button>

      {adding && (
        <AddressDialog
          open
          address={null}
          isFirst={addresses.length === 0}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}
