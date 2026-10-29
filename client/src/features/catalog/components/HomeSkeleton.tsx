/**
 * Khung chờ trang chủ: nền rừng đêm cao bằng hero + vài khung thẻ sách nhấp nháy,
 * để không giật bố cục khi dữ liệu đổ vào (trang chủ mục 5).
 */
export function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải trang chủ">
      <div
        className="min-h-[max(720px,calc(100svh-110px))]"
        style={{
          background:
            'linear-gradient(90deg, rgba(14,19,17,.94), rgba(14,19,17,.6)), url(/img/hero-forest.jpg) center 30% / cover',
        }}
      />
      <div className="wrap grid grid-cols-5 gap-5 pt-[110px] max-desk:grid-cols-4 max-phone:grid-cols-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="animate-blink aspect-[2/3] rounded-md border border-dashed border-[rgba(180,140,255,0.35)]"
            style={{ animationDuration: '1.4s' }}
          />
        ))}
      </div>
    </div>
  );
}
