'use client';

import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { IconPlus } from '@/components/ui/icons';
import { useDebounce } from '@/hooks/useDebounce';
import type { BookListItem } from '../../catalog-types';
import { useBookList } from '../hooks/useBooks';
import { StockDialog } from './StockDialog';

/** Nút "Nhập hàng" ở trang Tồn kho: chọn sách (tìm tên / ISBN) → mở hộp thoại nhập hàng có sẵn */
export function StockImport() {
  const [picking, setPicking] = useState(false);
  const [book, setBook] = useState<BookListItem | null>(null);
  const [input, setInput] = useState('');
  const q = useDebounce(input.trim());
  const books = useBookList({ q: q || undefined, sort: 'title_asc', page: 1, limit: 8 });

  const closeAll = () => {
    setPicking(false);
    setBook(null);
    setInput('');
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<IconPlus width={20} />}
        onClick={() => setPicking(true)}
        aria-label="Nhập hàng"
        className="a-action"
      >
        <span>Nhập hàng</span>
      </Button>

      <Dialog open={picking && !book} onClose={closeAll} maxWidth="xs" fullWidth>
        <DialogTitle>Chọn sách cần nhập</DialogTitle>
        <DialogContent className="!pt-2">
          <Autocomplete
            autoFocus
            options={books.data?.data ?? []}
            loading={books.isFetching}
            filterOptions={(options) => options}
            getOptionLabel={(option) => option.title}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            inputValue={input}
            onInputChange={(_event, value) => setInput(value)}
            onChange={(_event, value) => setBook(value)}
            noOptionsText="Không tìm thấy sách"
            loadingText="Đang tìm..."
            renderOption={({ key, ...props }, option) => (
              <li key={key} {...props}>
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="line-clamp-2">{option.title}</span>
                  <span className="shrink-0 text-sm text-bone-2">Tồn {option.stock}</span>
                </span>
              </li>
            )}
            renderInput={(params) => (
              <TextField {...params} label="Tên sách hoặc ISBN" autoFocus />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={closeAll}>
            Huỷ
          </Button>
        </DialogActions>
      </Dialog>

      {book && (
        <StockDialog
          open
          type="IMPORT"
          bookId={book.id}
          currentStock={book.stock}
          onClose={closeAll}
        />
      )}
    </>
  );
}
