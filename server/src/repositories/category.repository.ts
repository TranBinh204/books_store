import { pool, type Queryable } from '../db/pool';
import type { Category, PublicCategoryRow } from '../types/catalog.types';

const COLUMNS = `
  c.id,
  c.parent_id  AS "parentId",
  c.name,
  c.sort_order AS "sortOrder",
  c.is_active  AS "isActive",
  c.icon_key   AS "iconKey",
  c.description,
  (SELECT count(*)::int FROM books b WHERE b.category_id = c.id) AS "bookCount",
  c.created_at AS "createdAt",
  c.updated_at AS "updatedAt"
`;

export async function findAll(db: Queryable = pool): Promise<Category[]> {
  const { rows } = await db.query<Category>(
    `SELECT ${COLUMNS} FROM categories c ORDER BY c.sort_order, lower(c.name)`,
  );
  return rows;
}

/**
 * Cửa hàng: danh mục đang hiển thị (danh mục con chỉ hiện khi danh mục cha cũng hiện).
 * `bookCount` = số sách đang bán thuộc danh mục đang hiển thị; danh mục cha tính cả sách của con.
 */
export async function findAllPublic(db: Queryable = pool): Promise<PublicCategoryRow[]> {
  const { rows } = await db.query<PublicCategoryRow>(
    `SELECT c.id, c.parent_id AS "parentId", c.name, c.icon_key AS "iconKey", c.description,
       (SELECT count(*)::int
        FROM books b JOIN categories bc ON bc.id = b.category_id
        WHERE b.is_active AND bc.is_active AND (bc.id = c.id OR bc.parent_id = c.id)
       ) AS "bookCount"
     FROM categories c
     LEFT JOIN categories pc ON pc.id = c.parent_id
     WHERE c.is_active AND COALESCE(pc.is_active, true)
     ORDER BY c.sort_order, lower(c.name)`,
  );
  return rows;
}

export async function findById(id: number, db: Queryable = pool): Promise<Category | null> {
  const { rows } = await db.query<Category>(`SELECT ${COLUMNS} FROM categories c WHERE c.id = $1`, [
    id,
  ]);
  return rows[0] ?? null;
}

/** Tên đã tồn tại trong cùng danh mục cha? (không phân biệt hoa thường) */
export async function nameExists(
  parentId: number | null,
  name: string,
  excludeId?: number,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `SELECT 1 FROM categories
     WHERE COALESCE(parent_id, 0) = COALESCE($1::int, 0) AND lower(name) = lower($2)
       AND ($3::int IS NULL OR id <> $3)`,
    [parentId, name, excludeId ?? null],
  );
  return (rowCount ?? 0) > 0;
}

export async function hasChildren(id: number, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM categories WHERE parent_id = $1 LIMIT 1', [
    id,
  ]);
  return (rowCount ?? 0) > 0;
}

export interface CategoryFields {
  name: string;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  iconKey: string | null;
  description: string | null;
}

export async function create(input: CategoryFields, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO categories (name, parent_id, sort_order, is_active, icon_key, description)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      input.name,
      input.parentId,
      input.sortOrder,
      input.isActive,
      input.iconKey,
      input.description,
    ],
  );
  return rows[0].id;
}

export async function update(id: number, input: CategoryFields, db: Queryable = pool) {
  await db.query(
    `UPDATE categories
     SET name = $2, parent_id = $3, sort_order = $4, is_active = $5, icon_key = $6,
         description = $7
     WHERE id = $1`,
    [
      id,
      input.name,
      input.parentId,
      input.sortOrder,
      input.isActive,
      input.iconKey,
      input.description,
    ],
  );
}

export async function remove(id: number, db: Queryable = pool) {
  await db.query('DELETE FROM categories WHERE id = $1', [id]);
}
