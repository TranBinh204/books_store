import { ClickDust } from '@/components/fx/ClickDust';
import { MotionRoot } from '@/components/fx/MotionRoot';
import { BackToTop } from '@/components/layout/BackToTop';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { RuneBar } from '@/components/layout/RuneBar';

export default function ShopLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <RuneBar />
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
      <Footer />
      <BackToTop />
      {/* Hiệu ứng dùng chung (data-reveal, data-tilt…) + con trỏ Dark Fantasy, bụi tiên khi bấm — chỉ ở cửa hàng */}
      <MotionRoot />
      <ClickDust />
    </>
  );
}
