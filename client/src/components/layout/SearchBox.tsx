'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useId,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { BookCover } from '@/components/shop/BookCover';
import { IconSearch } from '@/components/ui/icons';
import {
  HOT_KEYWORDS,
  searchHref,
  SUGGESTION_MIN_LENGTH,
  useSuggestions,
} from '@/features/catalog';
import { useTypingPlaceholder } from '@/hooks/useTypingPlaceholder';
import { formatPrice } from '@/lib/format';
import styles from './SearchBox.module.css';

/** Cụm gợi ý cho placeholder tự gõ & chip "Câu thần chú phổ biến" — nội dung tĩnh như demo */
const PLACEHOLDERS = ['Tên Của Gió…', 'Harry Potter…', 'sách Tarot…', 'Murakami…'] as const;

/** Bỏ dấu + chữ thường để tìm phần khớp (đ → d) */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Tô đậm + gạch chân phần khớp với từ khoá (so không dấu; độ dài giữ nguyên với tiếng Việt NFC) */
function highlight(text: string, keyword: string): ReactNode {
  const i = norm(text).indexOf(norm(keyword));
  if (!keyword || i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className={styles.hl}>{text.slice(i, i + keyword.length)}</mark>
      {text.slice(i + keyword.length)}
    </>
  );
}

/**
 * Ô tìm kiếm trên Header (components.md 2.1): placeholder tự gõ, bấm vào khi chưa gõ → chip từ khoá phổ biến,
 * gõ ≥ 2 ký tự → tối đa 6 sách + "Xem tất cả"; ↑ ↓ chọn, Enter mở, Esc đóng.
 */
export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [keyword, setKeyword] = useState('');
  const [open, setOpen] = useState(false);
  /** Dòng đang chọn bằng phím: 0..n-1 = sách, n = "Xem tất cả", -1 = không chọn */
  const [active, setActive] = useState(-1);
  const placeholder = useTypingPlaceholder(PLACEHOLDERS, 'Tìm ', open || keyword !== '');

  const trimmed = keyword.trim();
  const { suggestions, loading, isError } = useSuggestions(keyword);
  const typing = trimmed.length >= SUGGESTION_MIN_LENGTH;
  const rowCount = suggestions.length + 1;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const goTo = (href: string) => {
    close();
    router.push(href);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (active >= 0 && active < suggestions.length) goTo(`/sach/${suggestions[active].id}`);
    else if (trimmed) goTo(searchHref(trimmed));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      close();
      event.currentTarget.blur();
      return;
    }
    if (!typing || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    // Xoay vòng qua rowCount + 1 trạng thái: -1 (không chọn), 0..rowCount-1
    const step = event.key === 'ArrowDown' ? 1 : -1;
    setActive((current) => ((current + 1 + step + rowCount + 1) % (rowCount + 1)) - 1);
  };

  // Bấm ra ngoài ô tìm kiếm / bảng gợi ý → đóng
  const handleBlur = (event: FocusEvent<HTMLFormElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };

  let panel: ReactNode;
  if (!typing) {
    panel = (
      <>
        <h5>Câu thần chú phổ biến</h5>
        <div className={styles.chips}>
          {HOT_KEYWORDS.map((word) => (
            <button
              key={word}
              type="button"
              className="chip"
              // mousedown + preventDefault: không làm ô nhập mất focus
              onMouseDown={(e) => {
                e.preventDefault();
                setKeyword(word);
              }}
            >
              {word}
            </button>
          ))}
        </div>
      </>
    );
  } else if (loading && suggestions.length === 0) {
    panel = <p className={styles.note}>Đang lật tìm trong thư viện…</p>;
  } else if (isError) {
    panel = <p className={styles.note}>Phép tìm kiếm trục trặc, bạn thử lại nhé.</p>;
  } else {
    panel = (
      <>
        {suggestions.length === 0 ? (
          <p className={styles.note}>Không tìm thấy &ldquo;{trimmed}&rdquo; trong thư viện…</p>
        ) : (
          suggestions.map((book, index) => (
            <Link
              key={book.id}
              href={`/sach/${book.id}`}
              role="option"
              aria-selected={index === active}
              onClick={close}
              onMouseEnter={() => setActive(index)}
              className={styles.item}
            >
              <span className={styles.cv}>
                <BookCover url={book.coverUrl} alt="" sizes="38px" />
              </span>
              <span>
                <b>{highlight(book.title, trimmed)}</b>
                {book.authors && book.authors.length > 0 && (
                  <small>{highlight(book.authors.map((a) => a.name).join(', '), trimmed)}</small>
                )}
              </span>
              <em>{formatPrice(book.price)}</em>
            </Link>
          ))
        )}
        <Link
          href={searchHref(trimmed)}
          role="option"
          aria-selected={active === suggestions.length}
          onClick={close}
          onMouseEnter={() => setActive(suggestions.length)}
          className={styles.all}
        >
          Xem tất cả kết quả cho &ldquo;{trimmed}&rdquo; →
        </Link>
      </>
    );
  }

  return (
    <form role="search" onSubmit={handleSubmit} onBlur={handleBlur} className={styles.search}>
      <input
        type="search"
        value={keyword}
        onChange={(event) => {
          setKeyword(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Tìm sách"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
      />
      <button type="submit" className={styles.submit} aria-label="Tìm kiếm">
        <IconSearch />
      </button>
      <div
        id={listId}
        role="listbox"
        className={`panel ${styles.panel}`}
        data-open={open ? '' : undefined}
      >
        {panel}
      </div>
    </form>
  );
}
