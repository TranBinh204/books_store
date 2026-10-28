/** Thanh tiến độ mảnh "đã dùng / giới hạn" của Admin (Voucher, Flash Sale); `limit` null = không giới hạn → không vẽ thanh */
export function UsageBar({ used, limit }: { used: number; limit: number | null }) {
  if (limit === null || limit <= 0) return null;
  const percent = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="a-bar" data-full={used >= limit} role="presentation">
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}
