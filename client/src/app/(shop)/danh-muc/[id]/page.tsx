import type { Metadata } from 'next';
import {
  categoryDescription,
  CategoryPageContent,
  loadCategory,
  parseListingParams,
} from '@/features/catalog';
import { idOrNotFound } from '@/lib/not-found';

interface CategoryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const category = await loadCategory(idOrNotFound((await params).id));
  return {
    title: category.name,
    description: categoryDescription(category),
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const id = idOrNotFound((await params).id);
  return <CategoryPageContent id={id} urlState={parseListingParams(await searchParams)} />;
}
