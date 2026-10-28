import styles from './Pager.module.css';

/** Dãy số trang rút gọn: 1 … 4 [5] 6 … 12 */
function pagesToShow(page: number, total: number): (number | null)[] {
  const wanted = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((n, index) => {
    if (index > 0 && n - sorted[index - 1] > 1) result.push(null);
    result.push(n);
  });
  return result;
}

/** Phân trang: ‹ 1 2 [3] … 9 › — số trang `--f-h`, trang hiện tại nền vàng */
export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const go = (next: number) => next >= 1 && next <= totalPages && next !== page && onChange(next);

  return (
    <nav aria-label="Phân trang" className={styles.pager}>
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Trang trước"
      >
        ‹
      </button>
      {pagesToShow(page, totalPages).map((n, index) =>
        n === null ? (
          <span key={`gap-${index}`} className={styles.gap} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => go(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Trang ${n}`}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label="Trang sau"
      >
        ›
      </button>
    </nav>
  );
}
