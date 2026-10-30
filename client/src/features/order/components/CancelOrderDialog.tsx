'use client';

import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Modal } from '@/components/ui/Modal';
import { errorMessage } from '@/lib/form';
import { useCancelOrder } from '../hooks/useOrders';
import { CANCEL_REASONS } from '../labels';
import styles from './CancelOrderDialog.module.css';

const OTHER = '__other__';
const OPTIONS = [
  ...CANCEL_REASONS.map((value) => ({ value, label: value })),
  { value: OTHER, label: 'Lý do khác' },
];

/** Huỷ đơn PENDING: chọn lý do (danh sách cố định + "Khác" phải tự nhập) */
export function CancelOrderDialog({
  order,
  onClose,
}: {
  order: { id: number; code: string } | null;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const cancel = useCancelOrder();
  const [choice, setChoice] = useState<string>(CANCEL_REASONS[0]);
  const [other, setOther] = useState('');
  const reason = choice === OTHER ? other.trim() : choice;

  const handleConfirm = () => {
    if (!order || reason.length < 2) return;
    cancel.mutate(
      { id: order.id, reason },
      {
        onSuccess: () => {
          enqueueSnackbar(`Đã huỷ đơn ${order.code}`, { variant: 'success' });
          onClose();
        },
        onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
      },
    );
  };

  return (
    <Modal
      open={order !== null}
      onClose={onClose}
      dismissible={!cancel.isPending}
      chapter="✦ Đơn hàng"
      title={
        <>
          Huỷ đơn <em>{order?.code}</em>?
        </>
      }
    >
      <div className={styles.body}>
        <ChoiceChips
          label="Vui lòng cho chúng tôi biết lý do huỷ đơn"
          options={OPTIONS}
          value={choice}
          onChange={(value) => value && setChoice(value)}
          clearable={false}
          layout="stack"
        />
        {choice === OTHER && (
          <input
            className="field"
            autoFocus
            placeholder="Nhập lý do"
            aria-label="Lý do huỷ đơn"
            value={other}
            onChange={(event) => setOther(event.target.value.slice(0, 255))}
          />
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={cancel.isPending}
          >
            <span>Không huỷ</span>
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            disabled={reason.length < 2 || cancel.isPending}
            aria-busy={cancel.isPending}
          >
            <span>Huỷ đơn</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
