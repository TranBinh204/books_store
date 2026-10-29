'use client';

import { Button, IconButton, Switch, Tooltip } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { AdminTag } from '@/components/ui/AdminTag';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Icon } from '@/components/ui/Icon';
import { IconEdit, IconPlus, IconTrash } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/form';
import type { Category } from '../../catalog-types';
import { useCategories, useDeleteCategory, useToggleCategory } from '../hooks/useCategories';
import { CategoryDialog } from './CategoryDialog';
import styles from './CategoryManager.module.css';

interface DialogState {
  open: boolean;
  category: Category | null;
  parentId: number | null;
}

/** Trang quản lý danh mục 2 cấp: bảng dạng cây, thêm / sửa / ẩn / xoá */
export function CategoryManager() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: roots = [], isPending } = useCategories();
  const toggle = useToggleCategory();
  const remove = useDeleteCategory();
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    category: null,
    parentId: null,
  });
  const [deleting, setDeleting] = useState<Category | null>(null);

  const openCreate = (parentId: number | null = null) =>
    setDialog({ open: true, category: null, parentId });
  const openEdit = (category: Category) =>
    setDialog({ open: true, category, parentId: category.parentId });

  const handleToggle = (category: Category) =>
    toggle.mutate(
      { id: category.id, isActive: !category.isActive },
      { onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }) },
    );

  const handleDelete = () =>
    deleting &&
    remove.mutate(deleting.id, {
      onSuccess: () => {
        enqueueSnackbar('Đã xoá danh mục', { variant: 'success' });
        setDeleting(null);
      },
      onError: (error) => {
        enqueueSnackbar(errorMessage(error), { variant: 'error' });
        setDeleting(null);
      },
    });

  /** `rowNumber`: số thứ tự hiển thị — danh mục gốc "1", danh mục con "1.1" (không phải id) */
  const renderRow = (category: Category, isChild: boolean, rowNumber: string, childCount = 0) => {
    // Chỉ xoá được danh mục không còn sách và không còn danh mục con
    const deleteBlock =
      category.bookCount > 0
        ? `Còn ${category.bookCount} sách, không xoá được`
        : childCount > 0
          ? 'Còn danh mục con, không xoá được'
          : null;
    return (
      <div
        key={category.id}
        className={`${styles.row} ${isChild ? styles.child : ''} ${
          category.isActive ? '' : styles.hidden
        }`}
      >
        <span className={styles.num}>{rowNumber}</span>
        {!isChild && <Icon name={category.iconKey} className={styles.icon} />}
        <div className={styles.name}>
          <span className={isChild ? styles.sub : styles.root}>{category.name}</span>
          {!category.isActive && <AdminTag>Đã ẩn</AdminTag>}
          <span className={styles.countNarrow}>{category.bookCount} sách</span>
        </div>
        <span className={styles.count}>{category.bookCount} sách</span>
        <Tooltip title={category.isActive ? 'Đang hiển thị — bấm để ẩn' : 'Đang ẩn — bấm để hiện'}>
          <Switch
            size="small"
            checked={category.isActive}
            onChange={() => handleToggle(category)}
            slotProps={{ input: { 'aria-label': `Hiển thị ${category.name}` } }}
          />
        </Tooltip>
        {!isChild && (
          <Tooltip title="Thêm danh mục con">
            <IconButton size="small" onClick={() => openCreate(category.id)} aria-label="Thêm danh mục con">
              <IconPlus width={20} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Sửa">
          <IconButton size="small" onClick={() => openEdit(category)} aria-label="Sửa danh mục">
            <IconEdit width={20} />
          </IconButton>
        </Tooltip>
        <Tooltip title={deleteBlock ?? 'Xoá'}>
          <span>
            <IconButton
              size="small"
              disabled={deleteBlock !== null}
              onClick={() => setDeleting(category)}
              aria-label="Xoá danh mục"
            >
              <IconTrash width={20} />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Danh mục sách"
        description="Danh mục 2 cấp (cha – con). Chỉ xoá được danh mục không còn sách và không còn danh mục con; muốn ẩn khỏi cửa hàng thì dùng công tắc."
        actions={
          <Button
            variant="contained"
            startIcon={<IconPlus width={20} />}
            onClick={() => openCreate()}
            aria-label="Thêm danh mục"
            className="a-action"
          >
            <span>Thêm danh mục</span>
          </Button>
        }
      />

      <div className={`a-panel ${styles.tree}`}>
        {isPending ? (
          <Spinner fill />
        ) : roots.length === 0 ? (
          <p className={styles.empty}>Chưa có danh mục nào. Bấm Thêm danh mục để bắt đầu.</p>
        ) : (
          roots.map((root, rootIndex) => (
            <div key={root.id}>
              {renderRow(root, false, `${rootIndex + 1}`, root.children.length)}
              {root.children.map((child, childIndex) =>
                renderRow(child, true, `${rootIndex + 1}.${childIndex + 1}`),
              )}
            </div>
          ))
        )}
      </div>

      <CategoryDialog
        open={dialog.open}
        category={dialog.category}
        defaultParentId={dialog.parentId}
        roots={roots}
        onClose={() => setDialog((state) => ({ ...state, open: false }))}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xoá danh mục"
        content={
          <>
            Xoá danh mục <strong>{deleting?.name}</strong>? Thao tác không thể hoàn tác.
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
