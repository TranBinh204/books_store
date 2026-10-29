'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconEdit, IconPlus, IconSearch, IconTrash } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';
import { rowNumberColumn, withRowNumbers, type WithRowNumber } from '@/lib/data-grid';
import { ApiError } from '@/lib/http';
import { errorMessage } from '@/lib/form';
import type { NamedEntity } from '../../catalog-types';
import type { NamedEntityResource } from '../api/named-entity.api';
import {
  useDeleteNamedEntity,
  useNamedEntityList,
  useSaveNamedEntity,
} from '../hooks/useNamedEntities';
import styles from './NamedEntityManager.module.css';

/** Tham số lọc của danh sách sách (`/admin/sach`) tương ứng từng loại */
const BOOK_FILTER_PARAM: Record<NamedEntityResource, string> = {
  authors: 'authorId',
  publishers: 'publisherId',
};

interface NamedEntityManagerProps {
  resource: NamedEntityResource;
  /** vd "Tác giả" */
  title: string;
  /** vd "tác giả" */
  label: string;
}

/** Trang quản lý tác giả / nhà xuất bản: bảng + tìm kiếm + thêm / đổi tên / xoá */
export function NamedEntityManager({ resource, title, label }: NamedEntityManagerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const narrow = useMediaQuery('(max-width: 479px)');
  const [keyword, setKeyword] = useState('');
  const q = useDebounce(keyword.trim());
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const list = useNamedEntityList(resource, {
    q: q || undefined,
    page: pagination.page + 1,
    limit: pagination.pageSize,
  });
  const save = useSaveNamedEntity(resource);
  const remove = useDeleteNamedEntity(resource);

  const [editing, setEditing] = useState<{ open: boolean; entity: NamedEntity | null }>({
    open: false,
    entity: null,
  });
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [deleting, setDeleting] = useState<NamedEntity | null>(null);

  const openDialog = (entity: NamedEntity | null) => {
    setEditing({ open: true, entity });
    setName(entity?.name ?? '');
    setNameError('');
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setNameError(`Vui lòng nhập tên ${label}`);
    save.mutate(
      { id: editing.entity?.id, name },
      {
        onSuccess: () => {
          enqueueSnackbar(editing.entity ? 'Đã đổi tên' : `Đã thêm ${label}`, {
            variant: 'success',
          });
          setEditing({ open: false, entity: null });
        },
        onError: (error) => {
          if (error instanceof ApiError && error.details?.length) setNameError(error.message);
          else enqueueSnackbar(errorMessage(error), { variant: 'error' });
        },
      },
    );
  };

  const handleDelete = () =>
    deleting &&
    remove.mutate(deleting.id, {
      onSuccess: () => enqueueSnackbar(`Đã xoá ${label}`, { variant: 'success' }),
      onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
      onSettled: () => setDeleting(null),
    });

  const columns: GridColDef<WithRowNumber<NamedEntity>>[] = [
    rowNumberColumn<NamedEntity>(),
    { field: 'name', headerName: `Tên ${label}`, flex: 1, minWidth: 200, sortable: false },
    {
      field: 'bookCount',
      headerName: 'Số sách',
      width: 110,
      sortable: false,
      renderCell: ({ row }) => (
        <div className="flex h-full items-center">
          {row.bookCount > 0 ? (
            <Tooltip title={`Xem sách của ${label} này`}>
              <Link
                href={`/admin/sach?${BOOK_FILTER_PARAM[resource]}=${row.id}&name=${encodeURIComponent(row.name)}`}
                className={`${styles.count} ${styles.countLink}`}
              >
                {row.bookCount}
              </Link>
            </Tooltip>
          ) : (
            <span className={styles.count}>0</span>
          )}
        </div>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 110,
      sortable: false,
      align: 'right',
      renderCell: ({ row }) => (
        <>
          <Tooltip title="Đổi tên">
            <IconButton size="small" onClick={() => openDialog(row)} aria-label="Đổi tên">
              <IconEdit width={20} />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.bookCount > 0 ? 'Đang có sách, không xoá được' : 'Xoá'}>
            <span>
              <IconButton
                size="small"
                disabled={row.bookCount > 0}
                onClick={() => setDeleting(row)}
                aria-label="Xoá"
              >
                <IconTrash width={20} />
              </IconButton>
            </span>
          </Tooltip>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={title}
        description={`${title} đang có sách thì không xoá được.`}
        actions={
          <Button
            variant="contained"
            startIcon={<IconPlus width={20} />}
            onClick={() => openDialog(null)}
            aria-label={`Thêm ${label}`}
            className="a-action"
          >
            <span>Thêm {label}</span>
          </Button>
        }
      />

      <div className="a-panel">
        <TextField
          size="small"
          placeholder={`Tìm theo tên ${label}...`}
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPagination((p) => ({ ...p, page: 0 }));
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
        <DataGrid
          rows={withRowNumbers(list.data?.data ?? [], pagination)}
          columns={columns}
          rowCount={list.data?.meta?.total ?? 0}
          loading={list.isFetching}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 20, 50]}
          columnVisibilityModel={{ rowNumber: !narrow }}
          localeText={{
            noRowsLabel: keyword
              ? `Không tìm thấy ${label} khớp từ khoá`
              : `Chưa có ${label} nào`,
          }}
          disableRowSelectionOnClick
          disableColumnMenu
          autoHeight
        />
      </div>

      <Dialog
        open={editing.open}
        onClose={() => setEditing({ open: false, entity: null })}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleSave} noValidate>
          <DialogTitle>{editing.entity ? `Đổi tên ${label}` : `Thêm ${label}`}</DialogTitle>
          <DialogContent className="!pt-2">
            <TextField
              autoFocus
              fullWidth
              label={`Tên ${label}`}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setNameError('');
              }}
              error={Boolean(nameError)}
              helperText={nameError}
              slotProps={{ htmlInput: { maxLength: 150 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={() => setEditing({ open: false, entity: null })}>
              Huỷ
            </Button>
            <Button type="submit" variant="contained" loading={save.isPending}>
              Lưu
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Xoá ${label}`}
        content={
          <>
            Xoá <strong>{deleting?.name}</strong>?
          </>
        }
        confirmText="Xoá"
        danger
        loading={remove.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

export function AuthorManager() {
  return <NamedEntityManager resource="authors" title="Tác giả" label="tác giả" />;
}

export function PublisherManager() {
  return <NamedEntityManager resource="publishers" title="Nhà xuất bản" label="nhà xuất bản" />;
}
