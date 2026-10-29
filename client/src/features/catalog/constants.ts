// File thường (không 'use client') → dùng được ở cả Server Component lẫn Client Component.
// Hằng số khai báo trong file 'use client' khi import vào Server Component sẽ thành
// "tham chiếu client", không còn là giá trị thật.

/** Số sách mỗi hàng sách gợi ý (Bán chạy ở trang tìm kiếm rỗng, giỏ hàng trống) */
export const HOME_SECTION_LIMIT = 12;

/**
 * Next.js giữ kết quả `GET /api/home` bao nhiêu giây (cache tầng 1 — trang chủ mục 4.1):
 * trong khoảng này dù bao nhiêu người vào, server API chỉ bị gọi 1 lần.
 */
export const HOME_REVALIDATE_SECONDS = 60;

/** Ô tìm kiếm: gõ ít hơn số ký tự này → không gợi ý (server cũng chặn) */
export const SUGGESTION_MIN_LENGTH = 2;

/** Chip "Câu thần chú phổ biến": ô tìm kiếm ở Header và trang không có kết quả */
export const HOT_KEYWORDS = ['Nguyễn Nhật Ánh', 'Murakami', 'Thói quen', 'Manga', 'Trinh thám'];
