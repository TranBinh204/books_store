import { pool, type Queryable } from '../db/pool';

// Sở thích đọc sách (M15)

export interface NamedRef {
  id: number;
  name: string;
}

export interface PreferenceRow {
  note: string;
  onboardedAt: Date | null;
  updatedAt: Date;
}

export async function findByUser(userId: number, db: Queryable = pool) {
  const { rows } = await db.query<PreferenceRow>(
    `SELECT note, onboarded_at AS "onboardedAt", updated_at AS "updatedAt"
     FROM user_preferences WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function listCategories(userId: number, db: Queryable = pool) {
  const { rows } = await db.query<NamedRef>(
    `SELECT c.id, c.name FROM user_preferred_categories upc
     JOIN categories c ON c.id = upc.category_id
     WHERE upc.user_id = $1
     ORDER BY c.sort_order, c.id`,
    [userId],
  );
  return rows;
}

export async function listAuthors(userId: number, db: Queryable = pool) {
  const { rows } = await db.query<NamedRef>(
    `SELECT a.id, a.name FROM user_preferred_authors upa
     JOIN authors a ON a.id = upa.author_id
     WHERE upa.user_id = $1
     ORDER BY lower(a.name)`,
    [userId],
  );
  return rows;
}

/** Số danh mục ĐANG HIỂN THỊ trong danh sách id */
export async function countActiveCategories(ids: number[], db: Queryable = pool) {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM categories WHERE id = ANY($1::int[]) AND is_active',
    [ids],
  );
  return rows[0].count;
}

/** Lưu mô tả; lần đầu lưu → đánh dấu đã hỏi */
export async function upsertNote(userId: number, note: string, db: Queryable = pool) {
  await db.query(
    `INSERT INTO user_preferences (user_id, note, onboarded_at) VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE SET
       note = EXCLUDED.note,
       onboarded_at = COALESCE(user_preferences.onboarded_at, now())`,
    [userId, note],
  );
}

/** Bỏ qua hộp thoại lần đầu — giữ nguyên sở thích đã có */
export async function markOnboarded(userId: number, db: Queryable = pool) {
  await db.query(
    `INSERT INTO user_preferences (user_id, onboarded_at) VALUES ($1, now())
     ON CONFLICT (user_id) DO UPDATE SET
       onboarded_at = COALESCE(user_preferences.onboarded_at, now())`,
    [userId],
  );
}

export async function replaceCategories(userId: number, ids: number[], db: Queryable = pool) {
  await db.query('DELETE FROM user_preferred_categories WHERE user_id = $1', [userId]);
  if (ids.length === 0) return;
  await db.query(
    `INSERT INTO user_preferred_categories (user_id, category_id)
     SELECT $1, unnest($2::int[])`,
    [userId, ids],
  );
}

export async function replaceAuthors(userId: number, ids: number[], db: Queryable = pool) {
  await db.query('DELETE FROM user_preferred_authors WHERE user_id = $1', [userId]);
  if (ids.length === 0) return;
  await db.query(
    `INSERT INTO user_preferred_authors (user_id, author_id)
     SELECT $1, unnest($2::int[])`,
    [userId, ids],
  );
}
