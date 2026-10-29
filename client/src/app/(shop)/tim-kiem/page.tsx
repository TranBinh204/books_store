import type { Metadata } from 'next';
import { parseListingParams, SearchPageContent, searchTitle } from '@/features/catalog';

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  return {
    title: await searchTitle(parseListingParams(await searchParams)),
    // Trang kết quả tìm kiếm không cần đưa vào công cụ tìm kiếm (nội dung trùng trang danh mục)
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  return <SearchPageContent urlState={parseListingParams(await searchParams)} />;
}
