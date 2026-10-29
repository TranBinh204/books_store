'use client';

import { Alert, Button } from '@mui/material';
import { IconExternal } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/form';
import { useBook } from '../hooks/useBooks';
import { BookForm } from './BookForm';
import { StockPanel } from './StockPanel';

/** Trang sửa sách: form + khối tồn kho */
export function BookEditPage({ id }: { id: number }) {
  const { data: book, isPending, isError, error } = useBook(id);

  return (
    <>
      <PageHeader
        title={book ? book.title : 'Sửa sách'}
        description={book && !book.isActive ? 'Sách đang ẩn khỏi cửa hàng' : undefined}
        back={{ href: '/admin/sach', label: 'Danh sách sách' }}
        actions={
          book?.isActive && (
            <Button
              component="a"
              href={`/sach/${book.id}`}
              target="_blank"
              rel="noopener"
              variant="outlined"
              startIcon={<IconExternal width={20} />}
              aria-label="Xem trên cửa hàng"
              className="a-action"
            >
              <span>Xem trên cửa hàng</span>
            </Button>
          )
        }
      />
      {isPending && <Spinner fill />}
      {isError && <Alert severity="error">{errorMessage(error)}</Alert>}
      {book && (
        <>
          <BookForm book={book} />
          <StockPanel book={book} />
        </>
      )}
    </>
  );
}
