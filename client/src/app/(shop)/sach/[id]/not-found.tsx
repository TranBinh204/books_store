import { NotFoundView } from '@/components/shop/NotFoundView';

export default function BookNotFound() {
  return (
    <NotFoundView
      title="Không tìm thấy sách"
      message="Cuốn sách bạn tìm không tồn tại hoặc đã ngừng kinh doanh."
    />
  );
}
