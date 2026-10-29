'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '@/lib/form';
import { useChangeStock } from '../hooks/useBooks';

interface StockDialogProps {
  open: boolean;
  type: 'IMPORT' | 'ADJUST';
  bookId: number;
  currentStock: number;
  onClose: () => void;
}

/** Nhập hàng (cộng thêm) hoặc Điều chỉnh (đặt về số thực tế, bắt buộc ghi lý do) */
export function StockDialog({ open, type, bookId, currentStock, onClose }: StockDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const changeStock = useChangeStock(bookId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ amount?: string; note?: string }>({});
  const isImport = type === 'IMPORT';

  const close = () => {
    setAmount('');
    setNote('');
    setErrors({});
    onClose();
  };

  const value = Number(amount);
  const preview = amount === '' ? null : isImport ? currentStock + value : value;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!/^\d+$/.test(amount)) nextErrors.amount = 'Nhập số nguyên ≥ 0';
    else if (isImport && value <= 0) nextErrors.amount = 'Số lượng nhập phải lớn hơn 0';
    else if (!isImport && value === currentStock) nextErrors.amount = 'Tồn kho không thay đổi';
    if (!isImport && !note.trim()) nextErrors.note = 'Vui lòng ghi lý do điều chỉnh';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    changeStock.mutate(
      isImport
        ? { type: 'IMPORT', quantity: value, note: note.trim() || null }
        : { type: 'ADJUST', newStock: value, note: note.trim() },
      {
        onSuccess: (result) => {
          enqueueSnackbar(`Đã cập nhật tồn kho: ${result.stock}`, { variant: 'success' });
          close();
        },
        onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
      },
    );
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{isImport ? 'Nhập hàng' : 'Điều chỉnh tồn kho'}</DialogTitle>
        <DialogContent className="flex flex-col gap-4 !pt-2">
          <p className="text-sm text-bone-2">
            Tồn kho hiện tại: <strong className="text-text">{currentStock}</strong>
            {preview !== null && !Number.isNaN(preview) && (
              <>
                {' '}
                → sau khi lưu: <strong className="text-primary">{preview}</strong>
              </>
            )}
          </p>
          <TextField
            autoFocus
            label={isImport ? 'Số lượng nhập thêm' : 'Tồn kho thực tế'}
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
            error={Boolean(errors.amount)}
            helperText={errors.amount}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            fullWidth
          />
          <TextField
            label={isImport ? 'Ghi chú (không bắt buộc)' : 'Lý do điều chỉnh'}
            placeholder={isImport ? 'vd: Nhập lô tháng 10' : 'vd: Kiểm kê — hỏng 2 cuốn'}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={Boolean(errors.note)}
            helperText={errors.note}
            required={!isImport}
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 500 } }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={close}>
            Huỷ
          </Button>
          <Button type="submit" variant="contained" loading={changeStock.isPending}>
            Lưu
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
