import type { Metadata } from 'next';
import { BookDetailContent, loadBook } from '@/features/catalog';
import { formatPrice } from '@/lib/format';
import { imageUrl } from '@/lib/image';
import { idOrNotFound } from '@/lib/not-found';

interface BookPageProps {
  params: Promise<{ id: string }>;
}

/** Số ký tự mô tả dùng cho thẻ meta description */
const META_DESCRIPTION_LENGTH = 160;

// SEO: tiêu đề = tên sách · mô tả = 160 ký tự đầu của mô tả sách · Open Graph = ảnh đại diện + giá
export async function generateMetadata({ params }: BookPageProps): Promise<Metadata> {
  const book = await loadBook(idOrNotFound((await params).id));
  const price =
    book.discountPercent > 0
      ? `${formatPrice(book.price)} (giảm ${book.discountPercent}%)`
      : formatPrice(book.price);
  const description =
    book.description?.replace(/\s+/g, ' ').trim().slice(0, META_DESCRIPTION_LENGTH) ||
    `${book.title} – giá ${price}, miễn phí giao hàng toàn quốc.`;

  return {
    title: book.title,
    description,
    openGraph: {
      title: `${book.title} – ${price}`,
      description,
      images: book.coverUrl ? [{ url: imageUrl(book.coverUrl, 1200), alt: book.title }] : [],
    },
  };
}

export default async function BookPage({ params }: BookPageProps) {
  return <BookDetailContent id={idOrNotFound((await params).id)} />;
}
