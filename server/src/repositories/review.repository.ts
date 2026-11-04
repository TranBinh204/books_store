import { pool, type Queryable } from '../db/pool';
import type { AdminReviewQuery } from '../schemas/review.schema';
import type {
  AdminReviewRow,
  MyReview,
  PublicReview,
  ReviewStatus,
  ReviewSummary,
} from '../types/review.types';
import { offsetOf, type PageParams } from '../utils/pagination';

// Đánh giá sách (M10)

/** Đơn của `userId`, đã giao, có `bookId`? (quy tắc 1) */
export async function isReviewable(
  userId: number,
  orderId: number,
  bookId: number,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.id = $1 AND o.user_id = $2 AND o.status = 'DELIVERED' AND oi.book_id = $3`,
    [orderId, userId, bookId],
  );
  return (rowCount ?? 0) > 0;
}

export async function insert(
  input: {
    userId: number;
    orderId: number;
    bookId: number;
    rating: number;
    content: string | null;
  },
  db: Queryable,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO reviews (user_id, order_id, book_id, rating, content)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [input.userId, input.orderId, input.bookId, input.rating, input.content],
  );
  return rows[0].id;
}

/** Thông tin cần để sửa / ẩn. `forUpdate` khoá dòng */
export async function findForUpdate(id: number, db: Queryable) {
  const { rows } = await db.query<{
    id: number;
    userId: number;
    bookId: number;
    isHidden: boolean;
    createdAt: Date;
  }>(
    `SELECT id, user_id AS "userId", book_id AS "bookId", is_hidden AS "isHidden",
       created_at AS "createdAt"
     FROM reviews WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return rows[0] ?? null;
}

export async function update(
  id: number,
  input: { rating: number; content: string | null },
  db: Queryable,
) {
  await db.query('UPDATE reviews SET rating = $2, content = $3, edited_at = now() WHERE id = $1', [
    id,
    input.rating,
    input.content,
  ]);
}

/** Ẩn (`reason`) / hiện lại (`reason = null`) */
export async function setHidden(
  id: number,
  hide: { reason: string; adminId: number } | null,
  db: Queryable,
) {
  await db.query(
    `UPDATE reviews SET is_hidden = $2, hidden_reason = $3, hidden_by = $4,
       hidden_at = CASE WHEN $2 THEN now() ELSE NULL END
     WHERE id = $1`,
    [id, hide !== null, hide?.reason ?? null, hide?.adminId ?? null],
  );
}

// ---------- Công khai ----------

export async function listPublic(
  bookId: number,
  filters: { rating?: number; withContent: boolean },
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: PublicReview[]; total: number }> {
  const { rows } = await db.query<PublicReview & { totalRows: number }>(
    `SELECT r.id, r.rating, r.content, u.full_name AS "authorName",
       (r.edited_at IS NOT NULL) AS "isEdited", r.created_at AS "createdAt",
       count(*) OVER()::int AS "totalRows"
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.book_id = $1 AND NOT r.is_hidden
       AND ($2::int IS NULL OR r.rating = $2)
       AND (NOT $3::boolean OR r.content IS NOT NULL)
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT $4 OFFSET $5`,
    [bookId, filters.rating ?? null, filters.withContent, page.limit, offsetOf(page)],
  );
  return {
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
    total: rows[0]?.totalRows ?? 0,
  };
}

export async function summary(bookId: number, db: Queryable = pool): Promise<ReviewSummary> {
  const { rows } = await db.query<{ rating: 1 | 2 | 3 | 4 | 5; count: number }>(
    `SELECT rating, count(*)::int AS count FROM reviews
     WHERE book_id = $1 AND NOT is_hidden GROUP BY rating`,
    [bookId],
  );
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) distribution[row.rating] = row.count;
  const count = rows.reduce((sum, row) => sum + row.count, 0);
  const total = rows.reduce((sum, row) => sum + row.rating * row.count, 0);
  return {
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    count,
    distribution,
  };
}

/** Tính lại điểm sách từ đánh giá đang hiện (quy tắc 7) — gọi trong transaction */
export async function refreshBookRating(bookId: number, db: Queryable) {
  await db.query(
    `UPDATE books SET
       rating_avg = COALESCE((SELECT round(avg(rating), 1) FROM reviews
                              WHERE book_id = $1 AND NOT is_hidden), 0),
       rating_count = (SELECT count(*) FROM reviews WHERE book_id = $1 AND NOT is_hidden)
     WHERE id = $1`,
    [bookId],
  );
}

// ---------- Của tôi ----------

const MY_COLUMNS = `
  r.id, r.order_id AS "orderId", r.book_id AS "bookId", r.rating, r.content,
  r.is_hidden AS "isHidden", (r.edited_at IS NOT NULL) AS "isEdited",
  (NOT r.is_hidden AND now() < r.created_at + make_interval(days => $2::int)) AS "canEdit",
  r.created_at AS "createdAt"`;

export async function findMine(
  userId: number,
  id: number,
  editDays: number,
  db: Queryable = pool,
): Promise<MyReview | null> {
  const { rows } = await db.query<MyReview>(
    `SELECT ${MY_COLUMNS} FROM reviews r WHERE r.user_id = $1 AND r.id = $3`,
    [userId, editDays, id],
  );
  return rows[0] ?? null;
}

/** Đánh giá của tôi trong 1 đơn */
export async function listMineByOrder(
  userId: number,
  orderId: number,
  editDays: number,
  db: Queryable = pool,
): Promise<MyReview[]> {
  const { rows } = await db.query<MyReview>(
    `SELECT ${MY_COLUMNS} FROM reviews r WHERE r.user_id = $1 AND r.order_id = $3
     ORDER BY r.id`,
    [userId, editDays, orderId],
  );
  return rows;
}

/** Trạng thái đánh giá 1 sách của tôi: đơn còn được viết + đánh giá đã viết */
export async function statusForBook(
  userId: number,
  bookId: number,
  editDays: number,
  db: Queryable = pool,
): Promise<ReviewStatus> {
  const orders = await db.query<ReviewStatus['reviewableOrders'][number]>(
    `SELECT o.id AS "orderId", o.code,
       (SELECT max(h.created_at) FROM order_status_history h
        WHERE h.order_id = o.id AND h.to_status = 'DELIVERED') AS "deliveredAt"
     FROM orders o
     WHERE o.user_id = $1 AND o.status = 'DELIVERED'
       AND EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.book_id = $2)
       AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.order_id = o.id AND r.book_id = $2)
     ORDER BY o.created_at DESC`,
    [userId, bookId],
  );
  const reviews = await db.query<MyReview>(
    `SELECT ${MY_COLUMNS} FROM reviews r WHERE r.user_id = $1 AND r.book_id = $3
     ORDER BY r.created_at DESC`,
    [userId, editDays, bookId],
  );
  return { reviewableOrders: orders.rows, myReviews: reviews.rows };
}

// ---------- Admin ----------

const ADMIN_SORTS: Record<AdminReviewQuery['sort'], string> = {
  newest: 'r.created_at DESC, r.id DESC',
  rating_asc: 'r.rating ASC, r.created_at DESC, r.id DESC',
};

export async function listForAdmin(
  filters: {
    /** Đã escape ký tự đặc biệt của LIKE */
    keyword?: string;
    rating?: number;
    status?: AdminReviewQuery['status'];
    from?: Date;
    to?: Date;
    sort: AdminReviewQuery['sort'];
  },
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: AdminReviewRow[]; total: number }> {
  const { rows } = await db.query<AdminReviewRow & { totalRows: number }>(
    `SELECT r.id, r.rating, r.content,
       r.is_hidden AS "isHidden", r.hidden_reason AS "hiddenReason", r.hidden_at AS "hiddenAt",
       (r.edited_at IS NOT NULL) AS "isEdited", r.created_at AS "createdAt",
       json_build_object('id', b.id, 'title', b.title) AS book,
       json_build_object('id', u.id, 'fullName', u.full_name, 'email', u.email) AS customer,
       json_build_object('id', o.id, 'code', o.code) AS "order",
       count(*) OVER()::int AS "totalRows"
     FROM reviews r
     JOIN books b ON b.id = r.book_id
     JOIN users u ON u.id = r.user_id
     JOIN orders o ON o.id = r.order_id
     WHERE ($1::int IS NULL OR r.rating = $1)
       AND ($2::boolean IS NULL OR r.is_hidden = $2)
       AND ($3::timestamptz IS NULL OR r.created_at >= $3)
       AND ($4::timestamptz IS NULL OR r.created_at < $4)
       AND ($5::text IS NULL
            OR lower(f_unaccent(b.title)) LIKE '%' || lower(f_unaccent($5)) || '%'
            OR lower(f_unaccent(u.full_name)) LIKE '%' || lower(f_unaccent($5)) || '%'
            OR u.email ILIKE '%' || $5 || '%'
            OR lower(f_unaccent(r.content)) LIKE '%' || lower(f_unaccent($5)) || '%')
     ORDER BY ${ADMIN_SORTS[filters.sort]}
     LIMIT $6 OFFSET $7`,
    [
      filters.rating ?? null,
      filters.status === undefined ? null : filters.status === 'hidden',
      filters.from ?? null,
      filters.to ?? null,
      filters.keyword ?? null,
      page.limit,
      offsetOf(page),
    ],
  );
  return {
    items: rows.map(({ totalRows: _totalRows, ...item }) => item),
    total: rows[0]?.totalRows ?? 0,
  };
}
