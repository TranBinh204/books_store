import { unstable_rethrow } from 'next/navigation';
import { Breadcrumb } from '@/components/shop/Breadcrumb';
import { hueFromId } from '@/lib/format';
import { orNotFound } from '@/lib/not-found';
import { getCategory, getCategoryTree, getFacets, listBooks } from '../api/catalog.api';
import {
  activeFilterCount,
  LISTING_PAGE_SIZE,
  toBookListParams,
  type ListingUrlState,
} from '../listing';
import type { BookListParams, PublicCategory, PublicCategoryDetail } from '../types/catalog.types';
import { categoryHref } from '../routes';
import { CategoryChips } from './CategoryChips';
import { HeroDescription, HeroIcon, HeroMeta, ListingHero } from './ListingHero';
import { ListingEmpty } from '@/components/shop/ListingEmpty';
import { ListingView } from './ListingView';

/** Lấy danh mục (ẩn / không có → 404). Dùng chung cho trang & generateMetadata */
export function loadCategory(id: number) {
  return orNotFound(getCategory(id));
}

/** Mô tả hiện ở đầu trang & thẻ meta: của Admin nhập, chưa có thì dùng câu mặc định */
export function categoryDescription(category: PublicCategoryDetail) {
  return category.description ?? `Khám phá ${category.bookCount} tác phẩm thuộc ${category.name}.`;
}

/** Cây danh mục (header cũng gọi nên Next gộp request) — lỗi thì bỏ chip, không hỏng trang */
async function loadTree() {
  try {
    return await getCategoryTree();
  } catch (error) {
    unstable_rethrow(error);
    return [];
  }
}

/**
 * Trang danh mục /danh-muc/[id] (Server Component — SEO):
 * breadcrumb · đầu danh mục · chip danh mục con / cùng cha · cột lọc · sắp xếp · lưới + "Xem thêm".
 */
export async function CategoryPageContent({
  id,
  urlState,
}: {
  id: number;
  urlState: ListingUrlState;
}) {
  const sort = urlState.sort ?? 'created_desc';
  const params: BookListParams = { ...toBookListParams(urlState), categoryId: id, sort };

  const [category, facets, firstPage, tree] = await Promise.all([
    loadCategory(id),
    getFacets(id),
    listBooks({ ...params, page: 1, limit: LISTING_PAGE_SIZE }),
    loadTree(),
  ]);

  // Danh mục cha → chip các con; danh mục con → chip các danh mục cùng cha (mục này sáng lên)
  const chips: PublicCategory[] =
    category.children.length > 0
      ? category.children
      : (tree.find((node) => node.id === category.parent?.id)?.children ?? []);

  const filtered = activeFilterCount(urlState) > 0;
  const clearHref = urlState.sort ? `${categoryHref(id)}?sort=${urlState.sort}` : categoryHref(id);

  return (
    <div className="wrap pb-10">
      <Breadcrumb
        items={[
          ...(category.parent
            ? [{ label: category.parent.name, href: categoryHref(category.parent.id) }]
            : []),
          { label: category.name },
        ]}
      />

      <ListingHero
        hue={hueFromId(category.id)}
        lead={<HeroIcon name={category.iconKey} />}
        kicker={category.parent ? `Vương quốc · ${category.parent.name}` : 'Vương quốc'}
        title={category.name}
      >
        <HeroDescription>{categoryDescription(category)}</HeroDescription>
        <HeroMeta>
          <b>{category.bookCount}</b> tác phẩm
        </HeroMeta>
      </ListingHero>

      <CategoryChips
        items={chips}
        currentId={category.children.length > 0 ? undefined : category.id}
        label={category.children.length > 0 ? 'Danh mục con' : 'Danh mục cùng cha'}
      />

      <ListingView
        urlState={urlState}
        params={params}
        firstPage={firstPage}
        sort={sort}
        publishers={facets.publishers}
        endText="Bạn đã đi hết vương quốc này"
        empty={
          filtered ? (
            <ListingEmpty
              icon={category.iconKey}
              message="Không có sản phẩm nào phù hợp với bộ lọc đã chọn"
              action={{ href: clearHref, label: 'Xoá bộ lọc', variant: 'gold' }}
            />
          ) : (
            <ListingEmpty
              icon={category.iconKey}
              message="Chưa có sản phẩm nào trong danh mục này"
              action={{ href: '/', label: 'Về trang chủ', variant: 'ghost' }}
            />
          )
        }
      />
    </div>
  );
}
