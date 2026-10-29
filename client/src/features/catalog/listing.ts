import type { BookListParams, BookSort } from './types/catalog.types';

// Bộ lọc & sắp xếp của trang danh mục / tìm kiếm — ghi trên URL để chia sẻ link, tải lại vẫn giữ.
// Dùng chung cho Server Component (đọc searchParams) và Client Component (đổi URL).
//   /danh-muc/3?sort=price_asc&price=100-200&publisherIds=2,5
//   /tim-kiem?q=nha+gia+kim&sort=sold_desc · /tim-kiem?authorId=7

/** Số sách mỗi lần tải ("Xem thêm sản phẩm" thêm từng ấy) */
export const LISTING_PAGE_SIZE = 20;

export const SORT_OPTIONS: { value: BookSort; label: string }[] = [
  { value: 'created_desc', label: 'Mới nhất' },
  { value: 'sold_desc', label: 'Bán chạy nhất' },
  { value: 'price_asc', label: 'Giá: Tăng dần' },
  { value: 'price_desc', label: 'Giá: Giảm dần' },
  { value: 'title_asc', label: 'Tên: A-Z' },
  { value: 'title_desc', label: 'Tên: Z-A' },
  { value: 'created_asc', label: 'Cũ nhất' },
];
/** Chỉ có khi tìm theo từ khoá */
export const RELEVANCE_OPTION = { value: 'relevance' as const, label: 'Liên quan nhất' };

/** Khoảng giá (chọn 1). `value` ghi lên URL, đơn vị nghìn đồng */
export const PRICE_RANGES = [
  { value: '0-100', label: 'Dưới 100.000₫', maxPrice: 99_999 },
  { value: '100-200', label: '100.000₫ – 200.000₫', minPrice: 100_000, maxPrice: 200_000 },
  { value: '200-300', label: '200.000₫ – 300.000₫', minPrice: 200_000, maxPrice: 300_000 },
  { value: '300-400', label: '300.000₫ – 400.000₫', minPrice: 300_000, maxPrice: 400_000 },
  { value: '400-', label: 'Trên 400.000₫', minPrice: 400_001 },
] as const satisfies readonly {
  value: string;
  label: string;
  minPrice?: number;
  maxPrice?: number;
}[];

export type PriceRangeValue = (typeof PRICE_RANGES)[number]['value'];

/** Giá trị trên URL đã kiểm tra hợp lệ (giá trị lạ → bỏ qua, không báo lỗi) */
export interface ListingUrlState {
  q?: string;
  authorId?: number;
  sort?: BookSort;
  price?: PriceRangeValue;
  publisherIds: number[];
}

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

const SORT_VALUES = new Set<string>([...SORT_OPTIONS, RELEVANCE_OPTION].map((o) => o.value));

export function parseListingParams(searchParams: RawSearchParams): ListingUrlState {
  const q = first(searchParams.q)?.trim() || undefined;
  const sort = first(searchParams.sort);
  const price = first(searchParams.price);
  const publisherIds = (first(searchParams.publisherIds) ?? '')
    .split(',')
    .map((id) => positiveInt(id))
    .filter((id): id is number => id !== undefined);

  return {
    q,
    authorId: positiveInt(first(searchParams.authorId)),
    // `relevance` chỉ hợp lệ khi có từ khoá
    sort:
      sort && SORT_VALUES.has(sort) && (sort !== 'relevance' || q) ? (sort as BookSort) : undefined,
    price: PRICE_RANGES.find((range) => range.value === price)?.value,
    publisherIds: [...new Set(publisherIds)],
  };
}

/** Trạng thái URL → tham số GET /api/books (chưa gồm page / limit / categoryId) */
export function toBookListParams(state: ListingUrlState): BookListParams {
  const range = PRICE_RANGES.find((item) => item.value === state.price);
  return {
    q: state.q,
    authorId: state.authorId,
    sort: state.sort,
    publisherIds: state.publisherIds.length > 0 ? state.publisherIds : undefined,
    minPrice: range && 'minPrice' in range ? range.minPrice : undefined,
    maxPrice: range && 'maxPrice' in range ? range.maxPrice : undefined,
  };
}

/** Số bộ lọc đang chọn (hiện trên nút "Bộ lọc" ở mobile) */
export function activeFilterCount(state: ListingUrlState) {
  return state.publisherIds.length + (state.price ? 1 : 0);
}
