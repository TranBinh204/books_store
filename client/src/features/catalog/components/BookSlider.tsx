import { BookCard } from '@/components/shop/BookCard';
import { Slider } from '@/components/shop/Slider';
import type { BookCardItem } from '../types/catalog.types';

/**
 * Hàng sách trượt ngang (components.md 2.6).
 * `variant="curse"` + `showFlashProgress`: khối Flash Sale "Lời nguyền nửa đêm" (M12).
 */
export function BookSlider({
  books,
  label = 'Danh sách sách',
  variant = 'default',
  showFlashProgress = false,
}: {
  books: BookCardItem[];
  label?: string;
  variant?: 'default' | 'curse';
  showFlashProgress?: boolean;
}) {
  return (
    <Slider label={label}>
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          variant={variant}
          showFlashProgress={showFlashProgress}
        />
      ))}
    </Slider>
  );
}
