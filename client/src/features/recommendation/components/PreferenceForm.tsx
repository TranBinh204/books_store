'use client';

import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useState, type ReactNode } from 'react';
import { TagInput } from '@/components/ui/TagInput';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { ToggleChip } from '@/components/ui/ToggleChips';
import type { IdName } from '@/features/catalog';
import { useDebounce } from '@/hooks/useDebounce';
import { AUTOCOMPLETE_DEBOUNCE_MS } from '@/lib/constants';
import { errorMessage } from '@/lib/form';
import { searchAuthors } from '../api/recommendation.api';
import { useCategoryOptions, useSavePreferences } from '../hooks/useRecommendation';
import type { Preferences } from '../types';
import styles from './PreferenceForm.module.css';

// Giới hạn giống server/.env (PREFERENCE_*) — server vẫn kiểm tra lại
const MAX_CATEGORIES = 10;
const MAX_AUTHORS = 10;
const NOTE_MAX_LENGTH = 300;

function SectionLabel({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={styles.label}>
      <p>{title}</p>
      {hint && <small>{hint}</small>}
    </div>
  );
}

/** Chọn thể loại: mỗi danh mục cha 1 hàng (chọn cha = gồm cả các danh mục con) */
function CategoryPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const { data: tree, isPending } = useCategoryOptions();
  const { enqueueSnackbar } = useSnackbar();

  const toggle = (id: number) => {
    if (value.includes(id)) return onChange(value.filter((item) => item !== id));
    if (value.length >= MAX_CATEGORIES) {
      enqueueSnackbar(`Chọn tối đa ${MAX_CATEGORIES} thể loại`, { variant: 'warning' });
      return;
    }
    onChange([...value, id]);
  };

  if (isPending) return <div className={`o-skel ${styles.skelCats}`} aria-busy="true" />;

  const chip = (category: IdName, parent = false) => (
    <ToggleChip
      key={category.id}
      checked={value.includes(category.id)}
      onChange={() => toggle(category.id)}
      strong={parent}
    >
      {category.name}
    </ToggleChip>
  );

  return (
    <div className={`scroll-x ${styles.cats}`}>
      {(tree ?? []).map((parent) => (
        <div key={parent.id} className={styles.group}>
          {chip(parent, true)}
          {parent.children.map((child) => chip(child))}
        </div>
      ))}
    </div>
  );
}

function AuthorPicker({ value, onChange }: { value: IdName[]; onChange: (v: IdName[]) => void }) {
  const [input, setInput] = useState('');
  const q = useDebounce(input.trim(), AUTOCOMPLETE_DEBOUNCE_MS);
  const { data, isFetching } = useQuery({
    queryKey: ['authors', 'search', q],
    queryFn: () => searchAuthors(q),
  });

  return (
    <TagInput
      label="Tác giả"
      value={value}
      onChange={onChange}
      query={input}
      onQueryChange={setInput}
      options={data ?? []}
      loading={isFetching}
      max={MAX_AUTHORS}
      placeholder="Vd: Nguyễn Nhật Ánh"
      emptyText={q ? 'Không tìm thấy tác giả' : 'Gõ tên tác giả để tìm'}
    />
  );
}

interface PreferenceFormProps {
  initial: Preferences;
  submitLabel?: string;
  onSaved?: (preferences: Preferences) => void;
  /** Nút phụ cạnh nút Lưu (vd "Bỏ qua") */
  secondaryAction?: ReactNode;
  /** Cho bấm Lưu kể cả khi chưa sửa gì (hộp thoại lần đầu: lưu = đánh dấu đã chọn) */
  alwaysEnabled?: boolean;
}

const sameIds = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** Form sở thích đọc sách (M15) — dùng ở trang Tài khoản & hộp thoại lần đăng nhập đầu */
export function PreferenceForm({
  initial,
  submitLabel = 'Lưu sở thích',
  onSaved,
  secondaryAction,
  alwaysEnabled = false,
}: PreferenceFormProps) {
  const { enqueueSnackbar } = useSnackbar();
  const save = useSavePreferences();
  const [categoryIds, setCategoryIds] = useState(() => initial.categories.map((c) => c.id));
  const [authors, setAuthors] = useState<IdName[]>(initial.authors);
  const [note, setNote] = useState(initial.note);

  const dirty =
    !sameIds(
      categoryIds,
      initial.categories.map((c) => c.id),
    ) ||
    !sameIds(
      authors.map((a) => a.id),
      initial.authors.map((a) => a.id),
    ) ||
    note.trim() !== initial.note.trim();

  const handleSubmit = () =>
    save.mutate(
      { categoryIds, authorIds: authors.map((a) => a.id), note: note.trim() },
      {
        onSuccess: (preferences) => {
          enqueueSnackbar('Đã lưu sở thích đọc sách', { variant: 'success' });
          onSaved?.(preferences);
        },
        onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
      },
    );

  return (
    <div className={styles.form}>
      <section>
        <SectionLabel
          title={`Thể loại yêu thích (${categoryIds.length}/${MAX_CATEGORIES})`}
          hint="Chọn danh mục lớn (chữ đậm) là gồm cả các thể loại bên trong"
        />
        <CategoryPicker value={categoryIds} onChange={setCategoryIds} />
      </section>

      <section>
        <SectionLabel title={`Tác giả yêu thích (${authors.length}/${MAX_AUTHORS})`} />
        <AuthorPicker value={authors} onChange={setAuthors} />
      </section>

      <section>
        <SectionLabel
          title="Mô tả thêm về gu đọc của bạn"
          hint="AI sẽ dựa vào đây để chọn và giải thích gợi ý"
        />
        <TextAreaField
          label="Gu đọc"
          value={note}
          onChange={setNote}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Vd: Mình thích sách phát triển bản thân nhẹ nhàng, dễ đọc, có ví dụ thực tế"
          rows={3}
        />
      </section>

      <div className={styles.bar}>
        {secondaryAction}
        <button
          type="button"
          className="btn btn-gold"
          onClick={handleSubmit}
          disabled={save.isPending || (!dirty && !alwaysEnabled)}
          aria-busy={save.isPending}
        >
          <span>{submitLabel}</span>
        </button>
      </div>
    </div>
  );
}
