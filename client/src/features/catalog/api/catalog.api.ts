import { http } from '@/lib/http';
import { HOME_REVALIDATE_SECONDS } from '../constants';
import type { HomeData } from '../types/home.types';
import type {
  BookCardItem,
  BookListParams,
  BookSuggestion,
  IdName,
  PublicBookDetail,
  PublicCategoryDetail,
  PublicCategoryNode,
  PublisherFacet,
} from '../types/catalog.types';

// Dùng được ở cả Server Component (SEO) lẫn trình duyệt (React Query).
// `no-store`: luôn lấy dữ liệu mới — Admin sửa sách / danh mục là cửa hàng thấy ngay
// (chưa cache, xem docs/03-modules/03-catalog.md Q6). Không có tuỳ chọn này, Next.js
// sẽ prerender trang lúc build với dữ liệu cũ.
const NO_STORE = { cache: 'no-store' } as const;

/** Dữ liệu công khai của trang chủ — 1 request, cache HOME_REVALIDATE_SECONDS giây (A8) */
export async function getHome() {
  return (await http.get<HomeData>('/home', { next: { revalidate: HOME_REVALIDATE_SECONDS } }))
    .data;
}

export async function getCategoryTree() {
  return (await http.get<PublicCategoryNode[]>('/categories', NO_STORE)).data;
}

export async function getCategory(id: number) {
  return (await http.get<PublicCategoryDetail>(`/categories/${id}`, NO_STORE)).data;
}

export async function listBooks({ publisherIds, ...params }: BookListParams = {}) {
  const { data, meta } = await http.get<BookCardItem[]>('/books', {
    ...NO_STORE,
    query: { ...params, publisherIds: publisherIds?.join(',') },
  });
  return { items: data, total: meta?.total ?? data.length, totalPages: meta?.totalPages ?? 1 };
}

export async function getBook(id: number) {
  return (await http.get<PublicBookDetail>(`/books/${id}`, NO_STORE)).data;
}

export async function getRelatedBooks(id: number) {
  return (await http.get<BookCardItem[]>(`/books/${id}/related`, NO_STORE)).data;
}

export async function getFacets(categoryId: number) {
  return (
    await http.get<{ publishers: PublisherFacet[] }>('/books/facets', {
      ...NO_STORE,
      query: { categoryId },
    })
  ).data;
}

export async function getAuthor(id: number) {
  return (await http.get<IdName>(`/authors/${id}`, NO_STORE)).data;
}

export async function getSuggestions(q: string) {
  return (await http.get<BookSuggestion[]>('/search/suggestions', { ...NO_STORE, query: { q } }))
    .data;
}
