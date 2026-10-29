'use client';

import {
  Alert,
  Button,
  Collapse,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { AdminTag } from '@/components/ui/AdminTag';
import {
  IconClose,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconImage,
  IconPlus,
  IconSearch,
} from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';
import { rowNumberColumn, withRowNumbers, type WithRowNumber } from '@/lib/data-grid';
import { discountPercent, formatPrice } from '@/lib/format';
import { errorMessage } from '@/lib/form';
import type { BookListItem, StockStatus } from '../../catalog-types';
import { CategorySelect } from '../../categories';
import type { BookListParams, BookSort } from '../api/book.api';
import { useBookList, useSetBookStatus } from '../hooks/useBooks';
import styles from './BookList.module.css';

const SORT_OPTIONS: { value: BookSort; label: string }[] = [
  { value: 'created_desc', label: 'Mới thêm' },
  { value: 'created_asc', label: 'Cũ nhất' },
  { value: 'title_asc', label: 'Tên A → Z' },
  { value: 'price_asc', label: 'Giá tăng dần' },
  { value: 'price_desc', label: 'Giá giảm dần' },
  { value: 'stock_asc', label: 'Tồn kho ít nhất' },
  { value: 'stock_desc', label: 'Tồn kho nhiều nhất' },
  { value: 'sold_desc', label: 'Bán chạy' },
];

/** Nhóm nút trạng thái / tồn kho (gộp 2 tham số API `status` và `stock`) */
type StatusFilter = 'all' | 'active' | 'hidden' | 'low' | 'out';
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang bán' },
  { value: 'hidden', label: 'Đã ẩn' },
  { value: 'low', label: 'Sắp hết' },
  { value: 'out', label: 'Hết hàng' },
];

const STOCK_TAG: Record<Exclude<StockStatus, 'IN_STOCK'>, { tone: 'warn' | 'bad'; label: string }> =
  {
    LOW_STOCK: { tone: 'warn', label: 'Sắp hết' },
    OUT_OF_STOCK: { tone: 'bad', label: 'Hết hàng' },
  };

/** Tag trạng thái bán + tồn kho (dùng ở cột Trạng thái; màn hẹp gộp xuống dưới tên sách) */
function StatusTag({ book }: { book: BookListItem }) {
  return book.isActive ? (
    <AdminTag tone="ok">Đang bán</AdminTag>
  ) : (
    <AdminTag>Đã ẩn</AdminTag>
  );
}

/** Danh sách sách (Admin): tìm kiếm, lọc, sắp xếp, phân trang phía server */
export function BookList() {
  const { enqueueSnackbar } = useSnackbar();
  const narrow = useMediaQuery('(max-width: 899px)');
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState('');
  const q = useDebounce(keyword.trim());
  const [categoryId, setCategoryId] = useState<number | null>(null);
  // Mở từ Dashboard / Tồn kho (`?stock=low|out`): lọc sẵn, tồn ít nhất trước
  const initialStock = searchParams.get('stock');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    initialStock === 'low' || initialStock === 'out' ? initialStock : 'all',
  );
  const [sort, setSort] = useState<BookSort>(initialStock ? 'stock_asc' : 'created_desc');
  // Mở từ trang Tác giả / NXB: `?authorId=` / `?publisherId=` (+ `name` chỉ để hiển thị)
  const initialScope = (key: string) => {
    const value = Number(searchParams.get(key));
    return Number.isInteger(value) && value > 0 ? value : null;
  };
  const [authorId, setAuthorId] = useState(() => initialScope('authorId'));
  const [publisherId, setPublisherId] = useState(() => initialScope('publisherId'));
  const scopeName = searchParams.get('name');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  // Gõ giá xong mới lọc (tránh gọi API mỗi lần gõ 1 chữ số)
  // (debounce 1 chuỗi thay vì object để giá trị ổn định giữa các lần render)
  const [debouncedMin, debouncedMax] = useDebounce(`${minPrice}|${maxPrice}`).split('|');
  const priceRangeValid =
    !debouncedMin || !debouncedMax || Number(debouncedMin) <= Number(debouncedMax);
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });

  const params: BookListParams = {
    q: q || undefined,
    categoryId: categoryId ?? undefined,
    authorId: authorId ?? undefined,
    publisherId: publisherId ?? undefined,
    status:
      statusFilter === 'active' || statusFilter === 'hidden' ? statusFilter : undefined,
    stock: statusFilter === 'low' || statusFilter === 'out' ? statusFilter : undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    // Khoảng giá đang nhập sai (từ > đến) → chưa áp dụng lọc giá
    minPrice: priceRangeValid && debouncedMin ? Number(debouncedMin) : undefined,
    maxPrice: priceRangeValid && debouncedMax ? Number(debouncedMax) : undefined,
    sort,
    page: pagination.page + 1,
    limit: pagination.pageSize,
  };
  const books = useBookList(params);
  const setBookStatus = useSetBookStatus();

  const resetPage = () => setPagination((p) => ({ ...p, page: 0 }));

  /** Cập nhật 1 bộ lọc và quay về trang 1 */
  const withReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      resetPage();
    };

  const advancedCount = [createdFrom, createdTo, minPrice, maxPrice].filter(Boolean).length;
  const hasFilters = Boolean(
    keyword ||
      categoryId ||
      authorId ||
      publisherId ||
      statusFilter !== 'all' ||
      advancedCount > 0,
  );
  const clearFilters = () => {
    setKeyword('');
    setCategoryId(null);
    setAuthorId(null);
    setPublisherId(null);
    setStatusFilter('all');
    setCreatedFrom('');
    setCreatedTo('');
    setMinPrice('');
    setMaxPrice('');
    resetPage();
  };
  const priceRangeInvalid = Boolean(minPrice && maxPrice && Number(minPrice) > Number(maxPrice));

  const toggleStatus = (book: BookListItem) =>
    setBookStatus.mutate(
      { id: book.id, isActive: !book.isActive },
      {
        onSuccess: () =>
          enqueueSnackbar(book.isActive ? 'Đã ẩn sách' : 'Đã hiện sách', { variant: 'success' }),
        onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
      },
    );

  const columns: GridColDef<WithRowNumber<BookListItem>>[] = [
    rowNumberColumn<BookListItem>(),
    {
      field: 'coverUrl',
      headerName: 'Ảnh',
      width: 72,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center">
          <span className="a-cover">
            {row.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh Cloudinary / local
              <img src={row.coverUrl} alt="" />
            ) : (
              <IconImage width={22} />
            )}
          </span>
        </div>
      ),
    },
    {
      field: 'title',
      headerName: 'Sách',
      flex: 1,
      minWidth: 220,
      renderCell: ({ row }) => (
        <div className={styles.titleCell}>
          <Link href={`/admin/sach/${row.id}`} className={styles.title}>
            {row.title}
          </Link>
          <span className={styles.author}>
            {row.authors.map((author) => author.name).join(', ')}
          </span>
          <span className={styles.narrowOnly}>
            <StatusTag book={row} />
          </span>
        </div>
      ),
    },
    {
      field: 'category',
      headerName: 'Danh mục',
      width: 160,
      valueGetter: (_value, row) => row.category.name,
    },
    {
      field: 'price',
      headerName: 'Giá',
      width: 150,
      renderCell: ({ row }) => {
        const percent = discountPercent(row.originalPrice, row.price);
        return (
          <div className={styles.priceCell}>
            <span className={styles.sale}>{formatPrice(row.price)}</span>
            {percent > 0 && (
              <span className={styles.was}>
                {formatPrice(row.originalPrice)}
                <span className={styles.off}>-{percent}%</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'stock',
      headerName: 'Tồn kho',
      width: 150,
      renderCell: ({ row }) => (
        <div className={styles.stockCell}>
          <span className={styles.stockNum}>{row.stock}</span>
          {row.stockStatus !== 'IN_STOCK' && (
            <AdminTag tone={STOCK_TAG[row.stockStatus].tone}>
              {STOCK_TAG[row.stockStatus].label}
            </AdminTag>
          )}
        </div>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Trạng thái',
      width: 120,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center">
          <StatusTag book={row} />
        </div>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 96,
      align: 'right',
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center">
          <Tooltip title="Sửa">
            <IconButton
              size="small"
              component={Link}
              href={`/admin/sach/${row.id}`}
              aria-label="Sửa sách"
            >
              <IconEdit width={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isActive ? 'Ẩn khỏi cửa hàng' : 'Hiện trên cửa hàng'}>
            <IconButton
              size="small"
              onClick={() => toggleStatus(row)}
              aria-label={row.isActive ? 'Ẩn sách' : 'Hiện sách'}
            >
              {row.isActive ? <IconEyeOff width={20} /> : <IconEye width={20} />}
            </IconButton>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Sách"
        description="Sách không xoá được, chỉ ẩn khỏi cửa hàng để giữ lịch sử đơn hàng."
        actions={
          <Button
            component={Link}
            href="/admin/sach/moi"
            variant="contained"
            startIcon={<IconPlus width={20} />}
            aria-label="Thêm sách"
            className="a-action"
          >
            <span>Thêm sách</span>
          </Button>
        }
      />

      <div className="a-panel">
        <div className={styles.toolbar}>
          <div className={styles.row}>
            <TextField
              size="small"
              placeholder="Tìm tên sách hoặc ISBN..."
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                resetPage();
              }}
              className={styles.search}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch width={18} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <div className={styles.select}>
              <CategorySelect
                size="small"
                label="Danh mục"
                allowAll
                fullWidth
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value);
                  resetPage();
                }}
              />
            </div>
            <TextField
              select
              size="small"
              label="Sắp xếp"
              value={sort}
              onChange={(event) => withReset(setSort)(event.target.value as BookSort)}
              className={styles.select}
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </div>

          <div className={styles.row}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={statusFilter}
              onChange={(_event, value: StatusFilter | null) => {
                if (value) withReset(setStatusFilter)(value);
              }}
              aria-label="Lọc theo trạng thái"
              className={styles.statusGroup}
            >
              {STATUS_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {(authorId || publisherId) && (
              <span className="a-tag a-tag-gold">
                <span className={styles.scope}>
                  {authorId ? 'Tác giả' : 'Nhà xuất bản'}: {scopeName ?? `#${authorId ?? publisherId}`}
                  <IconButton
                    size="small"
                    aria-label="Bỏ lọc"
                    onClick={() => {
                      setAuthorId(null);
                      setPublisherId(null);
                      resetPage();
                    }}
                  >
                    <IconClose width={14} />
                  </IconButton>
                </span>
              </span>
            )}
            <Button
              size="small"
              color="inherit"
              startIcon={<IconFilter width={18} />}
              onClick={() => setMoreOpen((open) => !open)}
              aria-expanded={moreOpen}
              className={styles.moreBtn}
            >
              Lọc thêm{advancedCount > 0 ? ` (${advancedCount})` : ''}
            </Button>
            {hasFilters && (
              <Button size="small" color="inherit" onClick={clearFilters}>
                Xoá bộ lọc
              </Button>
            )}
          </div>

          <Collapse in={moreOpen || advancedCount > 0} unmountOnExit>
            <div className={styles.advanced}>
              <TextField
                size="small"
                type="date"
                label="Thêm từ ngày"
                value={createdFrom}
                onChange={(event) => withReset(setCreatedFrom)(event.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: createdTo || undefined },
                }}
              />
              <TextField
                size="small"
                type="date"
                label="Đến ngày"
                value={createdTo}
                onChange={(event) => withReset(setCreatedTo)(event.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: createdFrom || undefined },
                }}
              />
              <TextField
                size="small"
                label="Giá bán từ"
                value={minPrice}
                onChange={(event) => withReset(setMinPrice)(event.target.value.replace(/\D/g, ''))}
                className={styles.price}
                slotProps={{
                  htmlInput: { inputMode: 'numeric' },
                  input: { endAdornment: <InputAdornment position="end">₫</InputAdornment> },
                }}
              />
              <TextField
                size="small"
                label="Đến"
                value={maxPrice}
                onChange={(event) => withReset(setMaxPrice)(event.target.value.replace(/\D/g, ''))}
                error={priceRangeInvalid}
                helperText={priceRangeInvalid ? 'Phải ≥ giá từ' : undefined}
                className={styles.price}
                slotProps={{
                  htmlInput: { inputMode: 'numeric' },
                  input: { endAdornment: <InputAdornment position="end">₫</InputAdornment> },
                }}
              />
            </div>
          </Collapse>
        </div>

        {books.isError && (
          <Alert severity="error" className="mb-3">
            {errorMessage(books.error)}
          </Alert>
        )}

        <DataGrid
          rows={withRowNumbers(books.data?.data ?? [], pagination)}
          columns={columns}
          columnVisibilityModel={{ category: !narrow, isActive: !narrow }}
          rowCount={books.data?.meta?.total ?? 0}
          loading={books.isFetching}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
          rowHeight={narrow ? 84 : 72}
          localeText={{
            noRowsLabel: hasFilters
              ? 'Không có sách nào khớp bộ lọc'
              : 'Chưa có sách nào, bấm Thêm sách để bắt đầu',
          }}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          autoHeight
        />
      </div>
    </>
  );
}
