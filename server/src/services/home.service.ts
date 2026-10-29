import { env } from '../config/env';
import * as bookRepository from '../repositories/book.repository';
import * as homeRepository from '../repositories/home.repository';
import type { HomeData, HomeFeaturedBook, HomeReview } from '../types/home.types';
import { toPublicItem } from './book.service';

// GET /api/home — gom dữ liệu công khai của trang chủ vào 1 request (A8),
// docs/06-ui-ux/shop/01-trang-chu.md mục 4. Số lượng mỗi khối theo bố cục demo 07.

export const HOME_FEATURED_LIMIT = 4;
export const HOME_VOUCHER_LIMIT = 4;
export const HOME_BESTSELLER_LIMIT = 11;
export const HOME_NEWEST_LIMIT = 12;
export const HOME_AUTHOR_LIMIT = 6;
export const HOME_REVIEW_LIMIT = 3;
/** "Lời kể": chỉ lấy đánh giá từ 4 sao, nội dung từ 40 ký tự */
export const HOME_REVIEW_MIN_RATING = 4;
export const HOME_REVIEW_MIN_LENGTH = 40;
/** Đoạn tóm tắt khối "Truyền thuyết" ~220 ký tự (lấy dư từ DB rồi cắt ở ranh giới từ) */
export const EXCERPT_LENGTH = 220;
const EXCERPT_FETCH_LENGTH = 400;

/** Cắt ở ranh giới từ gần `max` ký tự, thêm "…" nếu bị cắt */
export function toExcerpt(text: string, max = EXCERPT_LENGTH): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : clean.slice(0, max)).replace(/[\s,.;:–-]+$/, '')}…`;
}

/** Rút gọn tên để bảo vệ riêng tư: "Nguyễn Văn An" → "Nguyễn V. An"; 1–2 chữ giữ nguyên */
export function shortenName(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  if (words.length <= 2) return words.join(' ');
  const middle = words.slice(1, -1).map((w) => `${w[0].toUpperCase()}.`);
  return [words[0], ...middle, words[words.length - 1]].join(' ');
}

/** Một khối lỗi thì trả giá trị rỗng + ghi log — không làm hỏng cả trang chủ */
async function safe<T>(label: string, task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch (err) {
    console.error(`Trang chủ: không tải được khối ${label}`, err);
    return fallback;
  }
}

async function loadFeatured(): Promise<HomeFeaturedBook[]> {
  const rows = await homeRepository.findFeatured(
    HOME_FEATURED_LIMIT,
    env.FEATURED_MIN_REVIEWS,
    EXCERPT_FETCH_LENGTH,
  );
  return rows.map(({ description, ...row }) => ({
    ...toPublicItem(row),
    excerpt: toExcerpt(description),
  }));
}

async function loadBooks(sort: 'sold_desc' | 'created_desc', limit: number) {
  const { items } = await bookRepository.listPublic({ sort }, { page: 1, limit });
  return items.map((item) => toPublicItem(item));
}

async function loadReviews(): Promise<HomeReview[]> {
  const rows = await homeRepository.findFeaturedReviews(
    HOME_REVIEW_LIMIT,
    HOME_REVIEW_MIN_RATING,
    HOME_REVIEW_MIN_LENGTH,
  );
  return rows.map(({ fullName, ...row }) => ({ ...row, userName: shortenName(fullName) }));
}

async function load(): Promise<HomeData> {
  const [stats, featured, flashSale, vouchers, bestsellers, newest, authors, reviews] =
    await Promise.all([
      safe('thống kê', () => homeRepository.getStats(), null),
      safe('truyền thuyết', loadFeatured, []),
      safe('flash sale', async () => null, null),
      safe('voucher', async () => [], []),
      safe('bán chạy', () => loadBooks('sold_desc', HOME_BESTSELLER_LIMIT), []),
      safe('sách mới', () => loadBooks('created_desc', HOME_NEWEST_LIMIT), []),
      safe('tác giả', () => homeRepository.findFeaturedAuthors(HOME_AUTHOR_LIMIT), []),
      safe('lời kể', loadReviews, []),
    ]);
  return { stats, featured, flashSale, vouchers, bestsellers, newest, authors, reviews };
}

// ---------- Cache trong bộ nhớ (HOME_CACHE_TTL_SECONDS, 0 = tắt) ----------

let cached: { data: HomeData; expiresAt: number } | null = null;
/** Nhiều request tới cùng lúc khi hết cache → chỉ truy vấn DB 1 lần */
let inFlight: Promise<HomeData> | null = null;

export async function getHome(now = Date.now()): Promise<HomeData> {
  const ttlMs = env.HOME_CACHE_TTL_SECONDS * 1000;
  if (ttlMs > 0 && cached && cached.expiresAt > now) return cached.data;
  inFlight ??= load()
    .then((data) => {
      if (ttlMs > 0) cached = { data, expiresAt: Date.now() + ttlMs };
      return data;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/** Xoá cache (test) */
export function clearHomeCache() {
  cached = null;
  inFlight = null;
}
