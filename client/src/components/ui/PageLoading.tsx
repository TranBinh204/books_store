import { Spinner } from './Spinner';

/** Chờ giữa trang — fallback cho <Suspense> khi trang chờ đọc tham số URL */
export function PageLoading() {
  return <Spinner fill />;
}
