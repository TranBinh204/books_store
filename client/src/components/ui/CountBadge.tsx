/** Số lớn hơn → hiện "99+" */
const MAX_BADGE = 99;

/**
 * Chấm đỏ đếm số đặt góc icon (class `.badge` trong styles/ui.css; khung cha `position: relative`).
 * `key={count}` → mỗi lần số đổi thì phần tử được tạo lại và nảy lên một lần (demo: bump).
 * `hideZero`: số 0 thì ẩn (thông báo); giỏ hàng vẫn hiện 0 như demo.
 */
export function CountBadge({ count, hideZero = false }: { count: number; hideZero?: boolean }) {
  if (hideZero && count <= 0) return null;
  return (
    <span key={count} className="badge" aria-hidden="true">
      {count > MAX_BADGE ? `${MAX_BADGE}+` : count}
    </span>
  );
}
