'use client';

import { SectionTitle } from '@/components/shop/SectionTitle';
import { HOME_SECTION_LIMIT } from '../constants';
import { useBooks } from '../hooks/useBooks';
import { BookSlider } from './BookSlider';

/** Khối "Sản phẩm bán chạy" tải phía trình duyệt — chỉ gọi API khi được hiển thị (vd giỏ hàng trống) */
export function BestsellerSection() {
  const books = useBooks({ sort: 'sold_desc', limit: HOME_SECTION_LIMIT });
  const items = books.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="sec">
      <SectionTitle
        chapter="Bán chạy"
        title={
          <>
            Bảng <em>huyền thoại</em>
          </>
        }
        action={{ href: '/tim-kiem?sort=sold_desc', label: 'Xem tất cả' }}
        compact
      />
      <BookSlider books={items} />
    </section>
  );
}
