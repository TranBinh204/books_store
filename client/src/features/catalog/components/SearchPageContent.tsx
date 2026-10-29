import { cache } from 'react';
import { Breadcrumb } from '@/components/shop/Breadcrumb';
import { hueFromId } from '@/lib/format';
import { orNotFound } from '@/lib/not-found';
import { getAuthor, listBooks } from '../api/catalog.api';
import { LISTING_PAGE_SIZE, toBookListParams, type ListingUrlState } from '../listing';
import type { BookListParams } from '../types/catalog.types';
import { HeroHint, HeroMeta, ListingHero } from './ListingHero';
import { ListingEmpty } from '@/components/shop/ListingEmpty';
import { ListingView } from './ListingView';
import { MageSigil } from './home/MageSigil';
import { NoResults } from './NoResults';

/** Tác giả của trang "Sách của tác giả" (không có → 404). Trang & generateMetadata dùng chung */
export const loadAuthor = cache((id: number) => orNotFound(getAuthor(id)));

/** Tiêu đề trang theo trường hợp: theo tác giả · theo từ khoá · tất cả sản phẩm */
export async function searchTitle(state: ListingUrlState) {
  if (state.authorId) return `Sách của tác giả "${(await loadAuthor(state.authorId)).name}"`;
  if (state.q) return `Kết quả tìm kiếm "${state.q}"`;
  return 'Tất cả sản phẩm';
}

/** Link bỏ bộ lọc giá nhưng giữ từ khoá / tác giả / sắp xếp */
function clearPriceHref(state: ListingUrlState) {
  const query = new URLSearchParams();
  if (state.q) query.set('q', state.q);
  if (state.authorId) query.set('authorId', String(state.authorId));
  if (state.sort) query.set('sort', state.sort);
  const text = query.toString();
  return text ? `/tim-kiem?${text}` : '/tim-kiem';
}

/** Rỗng: bộ lọc giá · không khớp từ khoá · tác giả chưa có sách · kho chưa có sách */
function emptyState(state: ListingUrlState) {
  if (state.price) {
    return (
      <ListingEmpty
        message="Không có sản phẩm nào trong khoảng giá này"
        action={{ href: clearPriceHref(state), label: 'Xoá bộ lọc', variant: 'gold' }}
      />
    );
  }
  if (state.q) return <NoResults q={state.q} />;
  if (state.authorId) {
    return (
      <ListingEmpty
        message="Chưa có sách nào của tác giả này"
        action={{ href: '/tim-kiem', label: 'Xem tất cả sản phẩm', variant: 'ghost' }}
      />
    );
  }
  return (
    <ListingEmpty
      message="Chưa có sản phẩm nào."
      action={{ href: '/', label: 'Về trang chủ', variant: 'ghost' }}
    />
  );
}

/**
 * Trang /tim-kiem (Server Component):
 *   ?q=...       → kết quả tìm theo tên sách / tác giả / ISBN (mặc định "Liên quan nhất")
 *   ?authorId=.. → sách của 1 tác giả (bấm tên tác giả ở trang chi tiết / huy hiệu ở trang chủ)
 *   (không có)   → tất cả sản phẩm (link "Xem tất cả" ở trang chủ)
 */
export async function SearchPageContent({ urlState }: { urlState: ListingUrlState }) {
  const sort = urlState.sort ?? (urlState.q ? 'relevance' : 'created_desc');
  const params: BookListParams = { ...toBookListParams(urlState), sort };

  const [author, firstPage] = await Promise.all([
    urlState.authorId ? loadAuthor(urlState.authorId) : null,
    listBooks({ ...params, page: 1, limit: LISTING_PAGE_SIZE }),
  ]);

  return (
    <div className="wrap pb-10">
      <Breadcrumb items={[{ label: urlState.q || author ? 'Tìm kiếm' : 'Tất cả sản phẩm' }]} />

      {author ? (
        <ListingHero
          hue={hueFromId(author.id)}
          lead={<MageSigil id={author.id} name={author.name} size={104} />}
          kicker="Pháp sư ngôn từ"
          title={
            <>
              Sách của tác giả “<em>{author.name}</em>”
            </>
          }
        >
          <HeroMeta>
            <b>{firstPage.total}</b> tác phẩm
          </HeroMeta>
        </ListingHero>
      ) : urlState.q ? (
        <ListingHero
          hue={hueFromId(urlState.q.length)}
          kicker="Tìm kiếm"
          title={
            <>
              Kết quả tìm kiếm “<em>{urlState.q}</em>”
            </>
          }
        >
          <HeroMeta>
            Có <b>{firstPage.total} sản phẩm</b> cho tìm kiếm
          </HeroMeta>
          <HeroHint>Tìm theo tên sách · tác giả · ISBN</HeroHint>
        </ListingHero>
      ) : (
        <ListingHero hue={hueFromId(1)} kicker="Thư viện" title="Tất cả sản phẩm">
          <HeroMeta>
            <b>{firstPage.total}</b> tác phẩm
          </HeroMeta>
        </ListingHero>
      )}

      <ListingView
        urlState={urlState}
        params={params}
        firstPage={firstPage}
        sort={sort}
        endText="Bạn đã xem hết kết quả"
        empty={firstPage.total === 0 ? emptyState(urlState) : null}
      />
    </div>
  );
}
