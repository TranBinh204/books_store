'use client';

import {
  Alert,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { IconEye, IconEyeOff, IconFilter, IconSearch } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { RatingStars } from '@/features/review';
import { useDebounce } from '@/hooks/useDebounce';
import { errorMessage } from '@/lib/form';
import { formatDateTime } from '@/lib/format';
import type { AdminReviewParams, AdminReviewRow } from '../api/admin-review.api';
import { useAdminReviews, useSetReviewHidden } from '../hooks/useAdminReviews';
import { ReviewStatusTag } from './ReviewStatusTag';
import styles from './ReviewTable.module.css';

/** Lý do ẩn (M10 quy tắc 9) — "Khác" tự nhập */
const HIDE_REASONS = [
  'Spam / quảng cáo',
  'Ngôn từ không phù hợp',
  'Không liên quan đến sách',
  'Chứa thông tin cá nhân',
];
const OTHER = 'OTHER';

function HideDialog({ review, onClose }: { review: AdminReviewRow; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const setHidden = useSetReviewHidden();
  const [reason, setReason] = useState(HIDE_REASONS[0]);
  const [other, setOther] = useState('');
  const finalReason = reason === OTHER ? other.trim() : reason;

  return (
    <Dialog open onClose={setHidden.isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Ẩn đánh giá</DialogTitle>
      <DialogContent className="flex flex-col gap-2">
        {setHidden.isError && <Alert severity="error">{errorMessage(setHidden.error)}</Alert>}
        <p className="text-[15px] text-bone-2">
          Đánh giá của <strong>{review.customer.fullName}</strong> cho &ldquo;{review.book.title}
          &rdquo; sẽ không hiện công khai và không tính vào điểm sách.
        </p>
        <RadioGroup value={reason} onChange={(event) => setReason(event.target.value)}>
          {HIDE_REASONS.map((item) => (
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
            label="Lý do"
            value={other}
            onChange={(event) => setOther(event.target.value.slice(0, 255))}
            autoFocus
            fullWidth
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={setHidden.isPending} color="inherit">
          Đóng
        </Button>
        <Button
          variant="contained"
          color="error"
          loading={setHidden.isPending}
          disabled={finalReason.length < 2}
          onClick={() =>
            setHidden.mutate(
              { id: review.id, reason: finalReason },
              {
                onSuccess: () => {
                  enqueueSnackbar('Đã ẩn đánh giá', { variant: 'success' });
                  onClose();
                },
              },
            )
          }
        >
          Ẩn đánh giá
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Mobile: chạm hàng để đọc đủ nội dung đánh giá (cột Nội dung bị ẩn) */
function DetailDialog({
  review,
  onClose,
  onHide,
  onUnhide,
}: {
  review: AdminReviewRow;
  onClose: () => void;
  onHide: () => void;
  onUnhide: () => void;
}) {
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Đánh giá</DialogTitle>
      <DialogContent>
        <p className={styles.detailHead}>{review.book.title}</p>
        <p className={styles.detailMeta}>
          {review.customer.fullName} · {formatDateTime(review.createdAt)} · {review.order.code}
        </p>
        <RatingStars value={review.rating} size={18} />
        <p className={styles.detailText}>
          {review.content ?? <span className={styles.muted}>Không có nội dung</span>}
        </p>
        <div className="mt-3">
          <ReviewStatusTag isHidden={review.isHidden} hiddenReason={review.hiddenReason} />
          {review.isHidden && (
            <p className={`${styles.muted} mt-1 text-sm`}>Lý do: {review.hiddenReason}</p>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Đóng
        </Button>
        {review.isHidden ? (
          <Button variant="outlined" onClick={onUnhide}>
            Hiện lại
          </Button>
        ) : (
          <Button variant="contained" color="error" onClick={onHide}>
            Ẩn đánh giá
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

interface Filters {
  keyword: string;
  rating: string;
  status: NonNullable<AdminReviewParams['status']> | '';
  from: string;
  to: string;
  sort: AdminReviewParams['sort'];
}

const EMPTY_FILTERS: Filters = {
  keyword: '',
  rating: '',
  status: '',
  from: '',
  to: '',
  sort: 'newest',
};

const STATUS_OPTIONS: { value: Filters['status']; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'visible', label: 'Đang hiện' },
  { value: 'hidden', label: 'Đã ẩn' },
];
const RATING_OPTIONS = ['', '5', '4', '3', '2', '1'];

/** Trang /admin/danh-gia (M10 mục 4.4) */
export function ReviewTable() {
  const { enqueueSnackbar } = useSnackbar();
  const setHidden = useSetReviewHidden();
  const narrow = useMediaQuery('(max-width: 899px)');
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [moreOpen, setMoreOpen] = useState(false);
  const [hiding, setHiding] = useState<AdminReviewRow | null>(null);
  const [viewing, setViewing] = useState<AdminReviewRow | null>(null);
  const q = useDebounce(filters.keyword.trim());

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 0 }));
  };
  const hasFilters =
    filters.keyword ||
    filters.rating ||
    filters.status ||
    filters.from ||
    filters.to ||
    filters.sort !== 'newest';
  const advancedCount = [filters.from, filters.to].filter(Boolean).length;

  const reviews = useAdminReviews({
    q: q || undefined,
    rating: filters.rating ? Number(filters.rating) : undefined,
    status: filters.status || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    sort: filters.sort,
    page: pagination.page + 1,
    limit: pagination.pageSize,
  });

  const unhide = (review: AdminReviewRow) =>
    setHidden.mutate(
      { id: review.id, reason: null },
      {
        onSuccess: () => {
          enqueueSnackbar('Đã hiện lại đánh giá', { variant: 'success' });
          setViewing(null);
        },
        onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
      },
    );

  const columns: GridColDef<AdminReviewRow>[] = [
    {
      field: 'createdAt',
      headerName: 'Ngày',
      width: 140,
      valueFormatter: (value: string) => formatDateTime(value),
    },
    {
      field: 'book',
      headerName: 'Sách',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }) => (
        <span className={styles.bookCell}>
          <Link
            href={`/admin/sach/${row.book.id}`}
            className={styles.link}
            onClick={(event) => event.stopPropagation()}
          >
            {row.book.title}
          </Link>
          <span className={styles.sub}>
            {row.customer.fullName} · {formatDateTime(row.createdAt)}
          </span>
        </span>
      ),
    },
    {
      field: 'customer',
      headerName: 'Khách hàng',
      width: 170,
      renderCell: ({ row }) => (
        <Link href={`/admin/khach-hang/${row.customer.id}`} className={styles.link}>
          {row.customer.fullName}
        </Link>
      ),
    },
    {
      field: 'rating',
      headerName: 'Sao',
      width: 110,
      renderCell: ({ row }) => (
        <span className={styles.cell}>
          <RatingStars value={row.rating} size={15} />
        </span>
      ),
    },
    {
      field: 'content',
      headerName: 'Nội dung',
      flex: 1.5,
      minWidth: 220,
      renderCell: ({ row }) =>
        row.content ? (
          <Tooltip title={<span className="whitespace-pre-line">{row.content}</span>}>
            <span className={styles.content}>{row.content}</span>
          </Tooltip>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
    {
      field: 'order',
      headerName: 'Đơn hàng',
      width: 150,
      renderCell: ({ row }) => (
        <Link href={`/admin/don-hang/${row.order.id}`} className={styles.orderLink}>
          {row.order.code}
        </Link>
      ),
    },
    {
      field: 'isHidden',
      headerName: 'Trạng thái',
      width: 130,
      renderCell: ({ row }) => (
        <span className={styles.cell}>
          <ReviewStatusTag isHidden={row.isHidden} hiddenReason={row.hiddenReason} />
        </span>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: narrow ? 60 : 110,
      sortable: false,
      renderCell: ({ row }) => {
        const label = row.isHidden ? 'Hiện lại' : 'Ẩn';
        const onClick = (event: React.MouseEvent) => {
          event.stopPropagation();
          if (row.isHidden) unhide(row);
          else setHiding(row);
        };
        return narrow ? (
          <IconButton
            size="small"
            aria-label={`${label} đánh giá`}
            color={row.isHidden ? 'default' : 'error'}
            onClick={onClick}
            disabled={setHidden.isPending}
          >
            {row.isHidden ? <IconEye width={20} /> : <IconEyeOff width={20} />}
          </IconButton>
        ) : (
          <Button
            size="small"
            color={row.isHidden ? 'inherit' : 'error'}
            onClick={onClick}
            disabled={setHidden.isPending}
          >
            {label}
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Đánh giá"
        description="Đánh giá của khách đã mua sách — ẩn đánh giá vi phạm (không tính vào điểm sách)"
      />
      <div className="a-panel">
        <div className={styles.toolbar}>
          <div className={styles.row}>
            <TextField
              size="small"
              placeholder="Tên sách, khách hàng, nội dung..."
              value={filters.keyword}
              onChange={(event) => updateFilter('keyword', event.target.value)}
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
            <TextField
              select
              size="small"
              label="Sắp xếp"
              value={filters.sort}
              onChange={(event) => updateFilter('sort', event.target.value as Filters['sort'])}
              className={styles.select}
            >
              <MenuItem value="newest">Mới nhất</MenuItem>
              <MenuItem value="rating_asc">Sao thấp trước</MenuItem>
            </TextField>
          </div>
          <div className={styles.row}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filters.status}
              onChange={(_event, value: Filters['status'] | null) => {
                if (value !== null) updateFilter('status', value);
              }}
              aria-label="Lọc theo trạng thái"
              className={styles.group}
            >
              {STATUS_OPTIONS.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={filters.rating}
              onChange={(_event, value: string | null) => {
                if (value !== null) updateFilter('rating', value);
              }}
              aria-label="Lọc theo số sao"
              className={styles.group}
            >
              {RATING_OPTIONS.map((star) => (
                <ToggleButton key={star} value={star}>
                  {star ? `${star}★` : 'Mọi sao'}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
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
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setPagination((current) => ({ ...current, page: 0 }));
                }}
              >
                Xoá bộ lọc
              </Button>
            )}
          </div>
          <Collapse in={moreOpen || advancedCount > 0} unmountOnExit>
            <div className={styles.advanced}>
              <TextField
                size="small"
                type="date"
                label="Từ ngày"
                value={filters.from}
                onChange={(event) => updateFilter('from', event.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: filters.to || undefined },
                }}
              />
              <TextField
                size="small"
                type="date"
                label="Đến ngày"
                value={filters.to}
                onChange={(event) => updateFilter('to', event.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { min: filters.from || undefined },
                }}
              />
            </div>
          </Collapse>
        </div>

        {reviews.isError && (
          <Alert severity="error" className="mb-3">
            {errorMessage(reviews.error)}
          </Alert>
        )}
        <DataGrid
          rows={reviews.data?.items ?? []}
          columns={columns}
          columnVisibilityModel={{
            createdAt: !narrow,
            customer: !narrow,
            content: !narrow,
            order: !narrow,
          }}
          rowCount={reviews.data?.meta?.total ?? 0}
          loading={reviews.isFetching}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
          onRowClick={({ row }) => narrow && setViewing(row)}
          rowHeight={narrow ? 64 : 52}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          autoHeight
          localeText={{ noRowsLabel: 'Không có đánh giá phù hợp' }}
          sx={narrow ? { '& .MuiDataGrid-row': { cursor: 'pointer' } } : undefined}
        />
      </div>
      {hiding && <HideDialog review={hiding} onClose={() => setHiding(null)} />}
      {viewing && (
        <DetailDialog
          review={viewing}
          onClose={() => setViewing(null)}
          onHide={() => {
            setHiding(viewing);
            setViewing(null);
          }}
          onUnhide={() => unhide(viewing)}
        />
      )}
    </>
  );
}
