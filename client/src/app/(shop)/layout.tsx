import { unstable_rethrow } from 'next/navigation';
import { ClickDust } from '@/components/fx/ClickDust';
import { MotionRoot } from '@/components/fx/MotionRoot';
import { BackToTop } from '@/components/layout/BackToTop';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { RuneBar } from '@/components/layout/RuneBar';
import { catalogApi, type PublicCategoryNode } from '@/features/catalog';
import { ChatWidget } from '@/features/chat';
import { PreferenceOnboardingDialog } from '@/features/recommendation';

/** Cây danh mục cho menu — lỗi API thì menu rỗng, không làm hỏng cả trang */
async function loadCategories(): Promise<PublicCategoryNode[]> {
  try {
    return await catalogApi.getCategoryTree();
  } catch (error) {
    unstable_rethrow(error); // tín hiệu nội bộ của Next.js (render động), không phải lỗi API
    console.error('Không tải được danh mục cho menu', error);
    return [];
  }
}

export default async function ShopLayout({ children }: LayoutProps<'/'>) {
  const categories = await loadCategories();

  return (
    <>
      <RuneBar />
      <Header categories={categories} />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <BackToTop />
      {/* Hỏi sở thích đọc sách ở lần đăng nhập đầu (M15) */}
      <PreferenceOnboardingDialog />
      {/* Chatbox tư vấn AI — bong bóng kéo được (M16) */}
      <ChatWidget />
      {/* Hiệu ứng dùng chung (data-reveal, data-tilt…) + con trỏ Dark Fantasy, bụi tiên khi bấm — chỉ ở cửa hàng */}
      <MotionRoot />
      <ClickDust />
    </>
  );
}
