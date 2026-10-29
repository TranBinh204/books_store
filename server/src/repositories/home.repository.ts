import { pool, type Queryable } from '../db/pool';
import type { HomeAuthor, HomeStats } from '../types/home.types';
import {
  COVER_URL,
  PUBLIC_BOOKS_FROM,
  PUBLIC_BOOKS_VISIBLE,
  PUBLIC_COLUMNS,
  type PublicBookRow,
} from './book.repository';

// Dữ liệu riêng của trang chủ Dark Fantasy — docs/06-ui-ux/shop/01-trang-chu.md mục 4.4

/** Mô tả sách bỏ thẻ HTML + gộp khoảng trắng, lấy dư để service cắt ở ranh giới từ */
const PLAIN_DESCRIPTION = `left(trim(regexp_replace(regexp_replace(COALESCE(b.description, ''),
  '<[^>]*>', ' ', 'g'), '\\s+', ' ', 'g')), $2)`;

/**
 * A3 – "Truyền thuyết": sách có ≥ `minReviews` đánh giá xếp theo điểm sao, số đánh giá, đã bán;
 * thiếu thì bù bằng sách bán chạy (cùng 1 câu SQL: nhóm đủ đánh giá đứng trước).
 * Trong mỗi nhóm, sách có ảnh bìa thật đứng trước (khối nổi bật + chồng bìa hero không dùng bìa tự vẽ).
 */
export async function findFeatured(
  limit: number,
  minReviews: number,
  descriptionLength: number,
  db: Queryable = pool,
): Promise<(PublicBookRow & { description: string })[]> {
  const { rows } = await db.query<PublicBookRow & { description: string }>(
    `SELECT ${PUBLIC_COLUMNS}, ${PLAIN_DESCRIPTION} AS description
     FROM ${PUBLIC_BOOKS_FROM}
     WHERE ${PUBLIC_BOOKS_VISIBLE}
     ORDER BY (b.rating_count >= $1) DESC,
              EXISTS (SELECT 1 FROM book_images bi WHERE bi.book_id = b.id) DESC,
              CASE WHEN b.rating_count >= $1 THEN b.rating_avg END DESC NULLS LAST,
              CASE WHEN b.rating_count >= $1 THEN b.rating_count END DESC NULLS LAST,
              b.sold_count DESC, b.id DESC
     LIMIT $3`,
    [minReviews, descriptionLength, limit],
  );
  return rows;
}

/** A4 – số liệu hero: sách đang bán, khách hàng đang hoạt động, điểm trung bình mọi đánh giá đang hiện */
export async function getStats(db: Queryable = pool): Promise<HomeStats> {
  const { rows } = await db.query<HomeStats>(
    `SELECT
       (SELECT count(*) FROM ${PUBLIC_BOOKS_FROM} WHERE ${PUBLIC_BOOKS_VISIBLE})::int AS "bookCount",
       (SELECT count(*) FROM users WHERE role = 'CUSTOMER' AND is_active)::int AS "customerCount",
       (SELECT round(avg(rating), 1)::float FROM reviews WHERE NOT is_hidden) AS "avgRating"`,
  );
  return rows[0];
}

/**
 * A5 – "Hội pháp sư": tác giả có tổng lượt bán (sách đang bán) cao nhất.
 * `mainCategory` = danh mục có nhiều sách nhất của tác giả.
 */
export async function findFeaturedAuthors(
  limit: number,
  db: Queryable = pool,
): Promise<HomeAuthor[]> {
  const { rows } = await db.query<HomeAuthor>(
    `SELECT a.id, a.name, count(*)::int AS "bookCount",
       (SELECT c2.name
        FROM book_authors ba2
        JOIN books b2 ON b2.id = ba2.book_id AND b2.is_active
        JOIN categories c2 ON c2.id = b2.category_id
        WHERE ba2.author_id = a.id
        GROUP BY c2.id, c2.name
        ORDER BY count(*) DESC, c2.name
        LIMIT 1) AS "mainCategory"
     FROM authors a
     JOIN book_authors ba ON ba.author_id = a.id
     JOIN (${PUBLIC_BOOKS_FROM}) ON b.id = ba.book_id
     WHERE ${PUBLIC_BOOKS_VISIBLE}
     GROUP BY a.id, a.name
     ORDER BY sum(b.sold_count) DESC, count(*) DESC, a.id
     LIMIT $1`,
    [limit],
  );
  return rows;
}

export interface FeaturedReviewRow {
  rating: number;
  content: string;
  fullName: string;
  province: string | null;
  book: { id: number; title: string; coverUrl: string | null };
}

/**
 * A6 – "Lời kể": đánh giá đang hiện, ≥ `minRating` sao, nội dung ≥ `minLength` ký tự,
 * mỗi sách tối đa 1 đánh giá (mới nhất), xếp mới nhất trước. Tỉnh lấy từ địa chỉ mặc định.
 */
export async function findFeaturedReviews(
  limit: number,
  minRating: number,
  minLength: number,
  db: Queryable = pool,
): Promise<FeaturedReviewRow[]> {
  const { rows } = await db.query<FeaturedReviewRow>(
    `SELECT rating, content, "fullName", province, book FROM (
       SELECT DISTINCT ON (r.book_id)
         r.rating, r.content, r.created_at, u.full_name AS "fullName", ad.province,
         json_build_object('id', b.id, 'title', b.title, 'coverUrl', ${COVER_URL}) AS book
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN (${PUBLIC_BOOKS_FROM}) ON b.id = r.book_id
       LEFT JOIN addresses ad ON ad.user_id = u.id AND ad.is_default
       WHERE NOT r.is_hidden AND r.rating >= $2 AND char_length(r.content) >= $3
         AND ${PUBLIC_BOOKS_VISIBLE}
       ORDER BY r.book_id, r.created_at DESC
     ) t
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit, minRating, minLength],
  );
  return rows;
}
