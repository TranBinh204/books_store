import { pool, type Queryable } from '../db/pool';
import {
  PUBLIC_BOOKS_FROM,
  PUBLIC_BOOKS_VISIBLE,
  PUBLIC_COLUMNS,
  type PublicBookRow,
} from './book.repository';

// AI gợi ý sách (M15) — docs/03-modules/15-ai.md mục 6

/** Sách khách đã tương tác — tín hiệu "suy từ hành vi" của hồ sơ sở thích */
export interface BehaviorSignals {
  /** Nằm trong đơn chưa bị huỷ */
  boughtIds: number[];
  wishlistIds: number[];
  /** Đã đánh giá từ 4 sao */
  reviewedIds: number[];
}

export async function findBehaviorSignals(
  userId: number,
  db: Queryable = pool,
): Promise<BehaviorSignals> {
  const { rows } = await db.query<BehaviorSignals>(
    `SELECT
       ARRAY(SELECT DISTINCT oi.book_id FROM order_items oi JOIN orders o ON o.id = oi.order_id
             WHERE o.user_id = $1 AND o.status <> 'CANCELLED' ORDER BY 1) AS "boughtIds",
       ARRAY(SELECT book_id FROM wishlists WHERE user_id = $1 ORDER BY 1) AS "wishlistIds",
       ARRAY(SELECT DISTINCT book_id FROM reviews WHERE user_id = $1 AND rating >= 4 ORDER BY 1)
         AS "reviewedIds"`,
    [userId],
  );
  return rows[0];
}

/** Tên các sách (gửi AI làm ví dụ "khách đã thích") */
export async function findTitles(ids: number[], limit: number, db: Queryable = pool) {
  if (ids.length === 0) return [];
  const { rows } = await db.query<{ title: string }>(
    `SELECT title FROM books WHERE id = ANY($1::int[]) ORDER BY id DESC LIMIT $2`,
    [ids, limit],
  );
  return rows.map((row) => row.title);
}

export interface CandidateFilters {
  preferredCategoryIds: number[];
  preferredAuthorIds: number[];
  /** Sách đã mua / yêu thích / đánh giá cao → cùng thể loại, tác giả được cộng điểm */
  likedIds: number[];
  /** Không gợi ý lại (đã mua, đang yêu thích) */
  excludeIds: number[];
  limit: number;
  descriptionMaxLength: number;
}

/** Thông tin ứng viên gửi cho AI */
export interface Candidate {
  id: number;
  title: string;
  authors: string;
  category: string;
  description: string;
  score: number;
}

/**
 * Chấm điểm & lấy ứng viên: sách đang bán, còn hàng, chưa mua / chưa yêu thích.
 * +5 đúng thể loại khách chọn (chọn danh mục cha = tính cả con) · +5 có tác giả khách chọn
 * +3 cùng thể loại / +3 cùng tác giả với sách khách đã thích · rồi theo độ phổ biến.
 */
export async function listCandidates(
  filters: CandidateFilters,
  db: Queryable = pool,
): Promise<Candidate[]> {
  const { rows } = await db.query<Candidate>(
    `WITH liked_categories AS (SELECT DISTINCT category_id FROM books WHERE id = ANY($3::int[])),
          liked_authors AS (SELECT DISTINCT author_id FROM book_authors WHERE book_id = ANY($3::int[]))
     SELECT b.id, b.title, c.name AS category,
       COALESCE((SELECT string_agg(a.name, ', ' ORDER BY ba.sort_order)
                 FROM book_authors ba JOIN authors a ON a.id = ba.author_id
                 WHERE ba.book_id = b.id), '') AS authors,
       left(trim(regexp_replace(regexp_replace(COALESCE(b.description, ''), '<[^>]*>', ' ', 'g'),
                                '\\s+', ' ', 'g')), $6) AS description,
       (CASE WHEN b.category_id = ANY($1::int[]) OR c.parent_id = ANY($1::int[]) THEN 5 ELSE 0 END
        + CASE WHEN EXISTS (SELECT 1 FROM book_authors ba
                            WHERE ba.book_id = b.id AND ba.author_id = ANY($2::int[])) THEN 5 ELSE 0 END
        + CASE WHEN b.category_id IN (SELECT category_id FROM liked_categories) THEN 3 ELSE 0 END
        + CASE WHEN EXISTS (SELECT 1 FROM book_authors ba
                            WHERE ba.book_id = b.id
                              AND ba.author_id IN (SELECT author_id FROM liked_authors)) THEN 3 ELSE 0 END
       )::int AS score
     FROM ${PUBLIC_BOOKS_FROM}
     WHERE ${PUBLIC_BOOKS_VISIBLE} AND b.stock > 0 AND NOT (b.id = ANY($4::int[]))
     ORDER BY score DESC, ln(1 + b.sold_count) + COALESCE(b.rating_avg, 0) DESC, b.id DESC
     LIMIT $5`,
    [
      filters.preferredCategoryIds,
      filters.preferredAuthorIds,
      filters.likedIds,
      filters.excludeIds,
      filters.limit,
      filters.descriptionMaxLength,
    ],
  );
  return rows;
}

/** Thẻ sách công khai của các id — chỉ sách đang bán & còn hàng (thứ tự tuỳ ý) */
export async function findPublicCards(
  ids: number[],
  db: Queryable = pool,
): Promise<PublicBookRow[]> {
  if (ids.length === 0) return [];
  const { rows } = await db.query<PublicBookRow>(
    `SELECT ${PUBLIC_COLUMNS} FROM ${PUBLIC_BOOKS_FROM}
     WHERE b.id = ANY($1::int[]) AND ${PUBLIC_BOOKS_VISIBLE} AND b.stock > 0`,
    [ids],
  );
  return rows;
}

// ---------- Cache ----------

export interface CachedPick {
  bookId: number;
  reason: string | null;
}

export interface CacheRow {
  profileHash: string;
  items: CachedPick[];
  model: string;
  createdAt: Date;
}

export async function findCache(userId: number, db: Queryable = pool): Promise<CacheRow | null> {
  const { rows } = await db.query<CacheRow>(
    `SELECT profile_hash AS "profileHash", items, model, created_at AS "createdAt"
     FROM recommendation_cache WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function saveCache(
  userId: number,
  data: { profileHash: string; items: CachedPick[]; model: string },
  db: Queryable = pool,
): Promise<Date> {
  const { rows } = await db.query<{ createdAt: Date }>(
    `INSERT INTO recommendation_cache (user_id, profile_hash, items, model)
     VALUES ($1, $2, $3::jsonb, $4)
     ON CONFLICT (user_id) DO UPDATE SET
       profile_hash = EXCLUDED.profile_hash, items = EXCLUDED.items,
       model = EXCLUDED.model, created_at = now()
     RETURNING created_at AS "createdAt"`,
    [userId, data.profileHash, JSON.stringify(data.items), data.model],
  );
  return rows[0].createdAt;
}
