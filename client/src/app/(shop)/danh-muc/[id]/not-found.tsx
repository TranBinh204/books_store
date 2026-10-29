import { NotFoundView } from '@/components/shop/NotFoundView';

export default function CategoryNotFound() {
  return (
    <NotFoundView
      title="Không tìm thấy danh mục"
      message="Danh mục bạn tìm không tồn tại hoặc đã ngừng hiển thị."
    />
  );
}
