import { HealthCheckCard } from '@/features/system';

/** Trang chủ tạm của khung: kiểm tra client → /api (rewrite) → server → PostgreSQL */
export default function HomePage() {
  return (
    <section className="wrap flex flex-1 flex-col items-center justify-center gap-6 py-16">
      <h1>BookStore</h1>
      <HealthCheckCard />
    </section>
  );
}
