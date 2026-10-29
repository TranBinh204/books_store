/**
 * Khung giữ chỗ thẻ sách khi đang tải — demo 07 (.o-skel): khung gạch đứt, sọc tím chéo nhấp nháy.
 * Cao bằng thẻ thật (bìa 2/3 + chữ) để không giật bố cục.
 */
export function BookCardSkeleton() {
  return (
    <div className="o-skel p-3" aria-hidden="true">
      <div className="aspect-[2/3] w-full" />
      <div className="h-[110px]" />
    </div>
  );
}
