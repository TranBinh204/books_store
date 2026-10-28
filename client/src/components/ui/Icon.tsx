/** Khóa icon danh mục (categories.icon_key) — hình nằm trong components/fx/SvgDefs.tsx */
export const CATEGORY_ICON_KEYS = [
  'ky-nang',
  'tam-ly',
  'van-hoc',
  'thieu-nhi',
  'ngon-tinh',
  'on-thi',
  'fantasy',
  'manga',
  'gia-dinh',
] as const;
export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

/** Tên hiển thị của từng icon (ô chọn icon trong Admin) */
export const CATEGORY_ICON_LABELS: Record<CategoryIconKey, string> = {
  'ky-nang': 'Kỹ năng',
  'tam-ly': 'Tâm lý',
  'van-hoc': 'Văn học',
  'thieu-nhi': 'Thiếu nhi',
  'ngon-tinh': 'Ngôn tình',
  'on-thi': 'Ôn thi',
  fantasy: 'Fantasy',
  manga: 'Manga',
  'gia-dinh': 'Gia đình',
};

/** Icon mặc định khi danh mục chưa chọn icon */
export const DEFAULT_CATEGORY_ICON = 'sach';

/** Icon danh mục nét mảnh, màu theo `currentColor`. Thiếu / sai khóa → icon sách mặc định */
export function Icon({ name, className }: { name: string | null | undefined; className?: string }) {
  const key =
    name && (CATEGORY_ICON_KEYS as readonly string[]).includes(name) ? name : DEFAULT_CATEGORY_ICON;
  return (
    <svg className={className} aria-hidden="true" focusable="false">
      <use href={`#i-${key}`} />
    </svg>
  );
}
