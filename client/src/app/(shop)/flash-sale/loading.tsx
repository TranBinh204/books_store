import { BookCardSkeleton } from '@/components/shop/BookCardSkeleton';

export default function FlashSaleLoading() {
  return (
    <>
      <div className="wrap" aria-hidden="true">
        <div
          className="o-skel"
          style={{ width: 220, maxWidth: '100%', height: 20, margin: '12px 0' }}
        />
      </div>
      <section className="curse-bg" style={{ padding: '56px 0 40px' }} aria-busy="true">
        <div className="wrap">
          <div className="o-skel" style={{ height: 150, maxWidth: 560, margin: '0 auto 40px' }} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 200px), 1fr))',
              gap: 16,
            }}
          >
            {Array.from({ length: 10 }, (_, index) => (
              <BookCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
