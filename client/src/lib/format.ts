const priceFormatter = new Intl.NumberFormat('vi-VN');

/** 118300 → "118.300₫" */
export function formatPrice(value: number) {
  return `${priceFormatter.format(value)}₫`;
}

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "2026-10-03T07:30:00Z" → "03/10/2026 14:30" (giờ Việt Nam) */
export function formatDateTime(value: string | Date) {
  return dateTimeFormatter.format(new Date(value)).replace(',', '');
}

/** Phần trăm giảm giá: (79000, 63200) → 20 */
export function discountPercent(originalPrice: number, price: number) {
  if (originalPrice <= 0 || price >= originalPrice) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "vừa xong" · "5 phút trước" · "3 giờ trước" · "2 ngày trước" · > 7 ngày → "03/10/2026 14:30" */
export function formatRelativeTime(value: string | Date, now = Date.now()) {
  const diff = Math.max(0, now - new Date(value).getTime());
  if (diff < MINUTE) return 'vừa xong';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} phút trước`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} giờ trước`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} ngày trước`;
  return formatDateTime(value);
}

/** Số rút gọn kiểu demo: 950 → "950" · 1234 → "1,2k" · 48210 → "48k" */
export function formatCompact(value: number) {
  if (value < 1000) return String(value);
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace('.', ',')}k`;
}

/** Màu riêng (hue 0–360) cho danh mục / tác giả / bìa tự vẽ — tính từ id (design-system Q3) */
export function hueFromId(id: number) {
  return (id * 47) % 360;
}

/** Sao theo điểm làm tròn: 4.6 → "★★★★★", 3.2 → "★★★☆☆" */
export function formatStars(rating: number) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
}
