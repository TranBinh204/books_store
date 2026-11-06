'use client';

import { Autocomplete, InputAdornment, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BookCover } from '@/components/shop/BookCover';
import { IconSearch } from '@/components/ui/icons';
import { useDebounce } from '@/hooks/useDebounce';
import { formatPrice } from '@/lib/format';
import { listBooks } from '../../books/api/book.api';
import type { BookListItem } from '../../catalog-types';

/** Ô tìm sách đang bán (tên / ISBN) để thêm vào chương trình — sách đã thêm không hiện lại */
export function BookPicker({
  excludeIds,
  onPick,
}: {
  excludeIds: number[];
  onPick: (book: BookListItem) => void;
}) {
  const [input, setInput] = useState('');
  const q = useDebounce(input.trim());
  const books = useQuery({
    queryKey: ['admin', 'flash-sales', 'book-search', q],
    queryFn: async () =>
      (await listBooks({ q, status: 'active', sort: 'title_asc', page: 1, limit: 10 })).data,
    enabled: q.length > 0,
  });
  const options = (books.data ?? []).filter((book) => !excludeIds.includes(book.id));

  return (
    <Autocomplete<BookListItem>
      options={options}
      value={null}
      inputValue={input}
      onInputChange={(_event, value, reason) => {
        if (reason !== 'reset') setInput(value);
      }}
      onChange={(_event, book) => {
        if (book) {
          onPick(book);
          setInput('');
        }
      }}
      filterOptions={(all) => all}
      getOptionLabel={(book) => book.title}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      loading={books.isFetching}
      noOptionsText={q ? 'Không tìm thấy sách đang bán' : 'Gõ tên sách hoặc ISBN'}
      loadingText="Đang tìm..."
      renderOption={({ key, ...props }, book) => (
        <li key={key} {...props} className={`${props.className} flex items-center gap-3`}>
          <span className="a-cover">
            <BookCover url={book.coverUrl} alt={book.title} sizes="44px" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 block text-bone">{book.title}</span>
            <span className="text-sm text-bone-2">
              <span className="text-gold-hi">{formatPrice(book.price)}</span> · tồn {book.stock}
            </span>
          </span>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          placeholder="Tìm sách để thêm (tên / ISBN)..."
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: (
                <InputAdornment position="start">
                  <IconSearch width={18} />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
    />
  );
}
