import { ListingSkeleton } from '@/features/catalog';

export default function SearchLoading() {
  return <ListingSkeleton withFilters={false} />;
}
