'use client';

import { useState, type ReactNode } from 'react';
import { useListingUrl } from '../hooks/useListingUrl';
import { activeFilterCount, type ListingUrlState } from '../listing';
import type { BookListParams, BookSort, PublisherFacet } from '../types/catalog.types';
import { ActiveFilters } from './ActiveFilters';
import { BookListing, type BookPage } from './BookListing';
import { FilterDrawer } from './FilterDrawer';
import { FilterPanel } from './FilterPanel';
import styles from './Listing.module.css';
import { PriceChips } from './PriceChips';
import { SortSelect } from './SortSelect';

interface ListingViewProps {
  /** Trạng thái bộ lọc đọc từ URL */
  urlState: ListingUrlState;
  /** Tham số gọi API tương ứng (đã gồm categoryId nếu có) */
  params: BookListParams;
  firstPage: BookPage;
  /** Sắp xếp đang áp dụng (mặc định của trang khi URL không có `sort`) */
  sort: BookSort;
  /** Có → trang danh mục: cột lọc NXB + giá (ngăn kéo ở mobile); không → trang tìm kiếm: chip giá */
  publishers?: PublisherFacet[];
  /** Câu khép lại khi xem hết ("Bạn đã đi hết vương quốc này") */
  endText: string;
  empty: ReactNode;
}

/**
 * Phần tương tác của trang danh sách sách: cột lọc (desktop) / ngăn kéo "Bộ lọc" (≤ 1180px),
 * thanh công cụ (đếm · sắp xếp · chip lọc), lưới sách + "Xem thêm sản phẩm". Mọi thay đổi ghi lên URL.
 */
export function ListingView({
  urlState,
  params,
  firstPage,
  sort,
  publishers,
  endText,
  empty,
}: ListingViewProps) {
  const { update, pending } = useListingUrl();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const withFilters = publishers !== undefined;
  const filterCount = activeFilterCount(urlState);

  const setPublishers = (ids: number[]) => update({ publisherIds: ids.join(',') });
  const setPrice = (price: string | undefined) => update({ price });
  const clearAll = () => update({ publisherIds: undefined, price: undefined });

  const filterPanel = (bare: boolean) =>
    withFilters && (
      <FilterPanel
        bare={bare}
        publishers={publishers}
        publisherIds={urlState.publisherIds}
        price={urlState.price}
        onPublishersChange={setPublishers}
        onPriceChange={setPrice}
        onClear={clearAll}
      />
    );

  return (
    <div className={`${styles.body} ${withFilters ? '' : styles.single}`}>
      {withFilters && <aside className={styles.aside}>{filterPanel(false)}</aside>}

      <div className={styles.main}>
        <BookListing
          // Đổi bộ lọc → tạo lại danh sách từ trang 1 mới của server
          key={JSON.stringify(params)}
          params={params}
          firstPage={firstPage}
          empty={empty}
          pending={pending}
          wide={!withFilters}
          endText={endText}
          toolbar={({ shown, total }) => (
            <>
              <div className={styles.toolbar}>
                <p className={styles.count} aria-live="polite">
                  Hiển thị <b>{shown}</b> / <b>{total}</b> tác phẩm
                  {pending && (
                    <span className={styles.spin} aria-hidden="true">
                      ✦
                    </span>
                  )}
                </p>
                <div className={styles.tools}>
                  {withFilters && (
                    <button
                      type="button"
                      className={`btn btn-ghost btn-sm ${styles.filterBtn}`}
                      onClick={() => setDrawerOpen(true)}
                    >
                      Bộ lọc
                      {filterCount > 0 && <span className={styles.filterCount}>{filterCount}</span>}
                    </button>
                  )}
                  <SortSelect
                    value={sort}
                    withRelevance={Boolean(urlState.q)}
                    onChange={(value) => update({ sort: value })}
                  />
                </div>
              </div>
              {withFilters ? (
                <ActiveFilters
                  publishers={publishers}
                  urlState={urlState}
                  onRemovePublisher={(id) =>
                    setPublishers(urlState.publisherIds.filter((item) => item !== id))
                  }
                  onRemovePrice={setPrice}
                />
              ) : (
                <PriceChips value={urlState.price} onChange={setPrice} />
              )}
            </>
          )}
        />
      </div>

      {withFilters && (
        <FilterDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onClear={clearAll}
          total={firstPage.total}
          canClear={filterCount > 0}
        >
          {filterPanel(true)}
        </FilterDrawer>
      )}
    </div>
  );
}
