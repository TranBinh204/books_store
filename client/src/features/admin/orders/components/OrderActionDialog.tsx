'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { ORDER_STATUS_LABELS } from '@/features/order';
import { errorMessage } from '@/lib/form';
import { formatPrice } from '@/lib/format';
import { ApiError } from '@/lib/http';
import {
  adminOrdersKey,
  useAdminCancelOrder,
  useChangeOrderStatus,
  useRefundOrder,
} from '../hooks/useAdminOrders';
import { ADMIN_CANCEL_REASONS } from '../labels';
import type { AdminNextStatus, AdminOrderDetail } from '../types';

export type OrderAction =
  { type: 'status'; to: AdminNextStatus; label: string } | { type: 'cancel' } | { type: 'refund' };

const OTHER = 'OTHER';

/**
 * Hộp thoại cho mọi thao tác trên đơn (M08 mục 4.2): chuyển bước (ghi chú tuỳ chọn),
 * huỷ (chọn lý do), xác nhận hoàn tiền (ghi chú bắt buộc).
 * Mở mới mỗi lần (key ở nơi dùng) → không cần reset state.
 */
export function OrderActionDialog({
  order,
  action,
  onClose,
}: {
  order: AdminOrderDetail;
  action: OrderAction | null;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const changeStatus = useChangeOrderStatus(order.id);
  const cancel = useAdminCancelOrder(order.id);
  const refund = useRefundOrder(order.id);
  const [text, setText] = useState('');
  const [reason, setReason] = useState(ADMIN_CANCEL_REASONS[0]);
  const [error, setError] = useState<string | null>(null);

  if (!action) return null;
  const pending = changeStatus.isPending || cancel.isPending || refund.isPending;

  const handlers = {
    onSuccess: () => {
      enqueueSnackbar('Đã cập nhật đơn hàng', { variant: 'success' });
      onClose();
    },
    onError: (err: Error) => {
      // Đơn vừa đổi (Admin khác / khách / job / IPN) → đóng & tải lại chi tiết
      if (err instanceof ApiError && err.code === 'ORDER_STATUS_CHANGED') {
        enqueueSnackbar(err.message, { variant: 'warning' });
        void queryClient.invalidateQueries({ queryKey: adminOrdersKey });
        onClose();
        return;
      }
      setError(errorMessage(err));
    },
  };

  const cancelReason = reason === OTHER ? text.trim() : reason;
  const canSubmit =
    action.type === 'refund'
      ? text.trim().length >= 2
      : action.type === 'cancel'
        ? cancelReason.length >= 2
        : true;

  const submit = () => {
    setError(null);
    if (action.type === 'status') {
      changeStatus.mutate(
        { status: action.to, expectedStatus: order.status, note: text.trim() || null },
        handlers,
      );
    } else if (action.type === 'cancel') {
      cancel.mutate({ reason: cancelReason, expectedStatus: order.status }, handlers);
    } else {
      refund.mutate(text.trim(), handlers);
    }
  };

  const title =
    action.type === 'status'
      ? `${action.label} — ${order.code}`
      : action.type === 'cancel'
        ? `Huỷ đơn ${order.code}`
        : `Xác nhận đã hoàn tiền — ${order.code}`;

  return (
    <Dialog open onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent className="flex flex-col gap-3">
        {error && <Alert severity="error">{error}</Alert>}

        {action.type === 'status' && (
          <>
            <p className="text-sm">
              Chuyển đơn từ <strong>{ORDER_STATUS_LABELS[order.status].label}</strong> sang{' '}
              <strong>{ORDER_STATUS_LABELS[action.to].label}</strong>.
              {action.to === 'DELIVERED' && order.paymentMethod === 'COD' && (
                <>
                  {' '}
                  Đơn COD sẽ được ghi nhận <strong>đã thu {formatPrice(order.total)}</strong>.
                </>
              )}
            </p>
            <TextField
              label="Ghi chú (tuỳ chọn)"
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 255))}
              multiline
              minRows={2}
              fullWidth
            />
          </>
        )}

        {action.type === 'cancel' && (
          <>
            {order.paymentStatus === 'PAID' && (
              <Alert severity="warning">
                Đơn đã được thanh toán {formatPrice(order.total)} qua VNPay — sau khi huỷ, đơn sẽ
                chuyển sang <strong>Cần hoàn tiền</strong>.
              </Alert>
            )}
            <p className="text-sm text-bone-2">
              Tồn kho sẽ được hoàn lại. Khách nhận email thông báo kèm lý do.
            </p>
            <RadioGroup value={reason} onChange={(event) => setReason(event.target.value)}>
              {ADMIN_CANCEL_REASONS.map((item) => (
                <FormControlLabel
                  key={item}
                  value={item}
                  control={<Radio size="small" />}
                  label={item}
                />
              ))}
              <FormControlLabel value={OTHER} control={<Radio size="small" />} label="Lý do khác" />
            </RadioGroup>
            {reason === OTHER && (
              <TextField
                label="Lý do huỷ"
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, 255))}
                autoFocus
                fullWidth
              />
            )}
          </>
        )}

        {action.type === 'refund' && (
          <>
            <p className="text-sm">
              Hoàn <strong>{formatPrice(order.total)}</strong> cho khách trên cổng VNPay trước, sau
              đó xác nhận tại đây. Khách nhận email thông báo đã hoàn tiền.
            </p>
            <TextField
              label="Ghi chú hoàn tiền (vd mã giao dịch hoàn)"
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 255))}
              required
              autoFocus
              fullWidth
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending} color="inherit">
          Đóng
        </Button>
        <Button
          onClick={submit}
          loading={pending}
          disabled={!canSubmit}
          variant="contained"
          color={action.type === 'cancel' ? 'error' : 'primary'}
        >
          {action.type === 'status'
            ? action.label
            : action.type === 'cancel'
              ? 'Huỷ đơn'
              : 'Xác nhận đã hoàn tiền'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
