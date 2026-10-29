import { unstable_rethrow } from 'next/navigation';
import { SectionTitle } from '@/components/shop/SectionTitle';
import { HomeFlashSale } from '@/features/flash-sale/components/HomeFlashSale';
import { OwlLetter } from '@/features/newsletter';
import { HomeRecommendations } from '@/features/recommendation';
import { HomeVouchers } from '@/features/voucher';
import { getCategoryTree, getHome } from '../api/catalog.api';
import type { PublicCategoryNode } from '../types/catalog.types';
import type { HomeData } from '../types/home.types';
import { BookSlider } from './BookSlider';
import { HallOfFame } from './home/HallOfFame';
import { HomeHero } from './home/HomeHero';
import { HomeIntro } from './home/HomeIntro';
import { LegendList } from './home/LegendList';
import { MageGrid } from './home/MageGrid';
import { PromoBanners } from './home/PromoBanners';
import { QuoteScroll } from './home/QuoteScroll';
import { RealmGrid } from './home/RealmGrid';
import { TaleGrid } from './home/TaleGrid';
import { VowGrid } from './home/VowGrid';

const EMPTY_HOME: HomeData = {
  stats: null,
  featured: [],
  flashSale: null,
  vouchers: [],
  bestsellers: [],
  newest: [],
  authors: [],
  reviews: [],
};

/** Dữ liệu trang chủ (1 request, cache 60s) — lỗi API thì các khối dữ liệu ẩn, khối tĩnh vẫn hiện */
async function loadHome(): Promise<HomeData> {
  try {
    return await getHome();
  } catch (error) {
    unstable_rethrow(error);
    console.error('Không tải được dữ liệu trang chủ', error);
    return EMPTY_HOME;
  }
}

/** Cây danh mục — dùng chung request với header (Next gộp request trùng) */
async function loadCategories(): Promise<PublicCategoryNode[]> {
  try {
    return await getCategoryTree();
  } catch (error) {
    unstable_rethrow(error);
    console.error('Không tải được danh mục trang chủ', error);
    return [];
  }
}

/**
 * Trang chủ Dark Fantasy — giống demo 07 (docs/06-ui-ux/shop/01-trang-chu.md mục 2):
 * Hero · Giới thiệu · I Vương quốc · II Lời nguyền nửa đêm · III Truyền thuyết · Banner ·
 * IV Cuộn bùa · V Quả cầu tiên tri · VI Bảng huyền thoại · VII Vừa hiện hình · Trích dẫn ·
 * VIII Hội pháp sư · IX Lời kể · Lời thề · Thư cú. Khối không có dữ liệu thì ẩn.
 */
export async function HomeContent() {
  const [home, categories] = await Promise.all([loadHome(), loadCategories()]);
  const shelf = home.featured.length >= 3 ? home.featured : home.bestsellers;

  return (
    <>
      <HomeHero stats={home.stats} books={shelf} />
      <HomeIntro />
      <RealmGrid categories={categories} />
      <HomeFlashSale sale={home.flashSale} />
      <LegendList books={home.featured} />
      <PromoBanners />
      <HomeVouchers vouchers={home.vouchers} />
      <HomeRecommendations />
      <HallOfFame books={home.bestsellers} />
      {home.newest.length > 0 && (
        <section className="sec" data-pausable>
          <div className="wrap">
            <SectionTitle
              chapter="Chương VII · Sách mới"
              title={
                <>
                  Vừa <em>hiện hình</em>
                </>
              }
              action={{ href: '/tim-kiem?sort=created_desc', label: 'Xem mọi sách mới' }}
            />
            <BookSlider books={home.newest} label="Sách mới" />
          </div>
        </section>
      )}
      <QuoteScroll />
      <MageGrid authors={home.authors} />
      <TaleGrid reviews={home.reviews} />
      <VowGrid />
      <OwlLetter />
    </>
  );
}
