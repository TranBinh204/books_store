import { pool, type Queryable } from '../db/pool';
import type { NamedEntity } from '../types/catalog.types';
import { offsetOf, type PageParams } from '../utils/pagination';

interface NamedEntityConfig {
  /** Tên bảng (hằng số trong code, không lấy từ người dùng) */
  table: 'authors' | 'publishers';
  /** Biểu thức SQL đếm số sách đang dùng bản ghi `e` */
  bookCountSql: string;
}

/** Repository dùng chung cho các bảng chỉ có tên: tác giả, nhà xuất bản */
export function createNamedEntityRepository({ table, bookCountSql }: NamedEntityConfig) {
  const columns = `
    e.id,
    e.name,
    (${bookCountSql})::int AS "bookCount",
    e.created_at AS "createdAt",
    e.updated_at AS "updatedAt"
  `;

  return {
    async list(
      keyword: string | undefined,
      page: PageParams,
      db: Queryable = pool,
    ): Promise<{ items: NamedEntity[]; total: number }> {
      const { rows } = await db.query<NamedEntity & { total: number }>(
        `SELECT ${columns}, count(*) OVER()::int AS total
         FROM ${table} e
         WHERE $1::text IS NULL OR lower(f_unaccent(e.name)) LIKE '%' || lower(f_unaccent($1)) || '%'
         ORDER BY lower(e.name)
         LIMIT $2 OFFSET $3`,
        [keyword ?? null, page.limit, offsetOf(page)],
      );
      return {
        items: rows.map(({ total: _total, ...item }) => item),
        total: rows[0]?.total ?? 0,
      };
    },

    async findById(id: number, db: Queryable = pool): Promise<NamedEntity | null> {
      const { rows } = await db.query<NamedEntity>(
        `SELECT ${columns} FROM ${table} e WHERE e.id = $1`,
        [id],
      );
      return rows[0] ?? null;
    },

    /** Số id trong danh sách có tồn tại (dùng kiểm tra khi lưu sách) */
    async countExisting(ids: number[], db: Queryable = pool): Promise<number> {
      const { rows } = await db.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM ${table} WHERE id = ANY($1::int[])`,
        [ids],
      );
      return rows[0].count;
    },

    async nameExists(name: string, excludeId?: number, db: Queryable = pool): Promise<boolean> {
      const { rowCount } = await db.query(
        `SELECT 1 FROM ${table} WHERE lower(name) = lower($1) AND ($2::int IS NULL OR id <> $2)`,
        [name, excludeId ?? null],
      );
      return (rowCount ?? 0) > 0;
    },

    async create(name: string, db: Queryable = pool): Promise<number> {
      const { rows } = await db.query<{ id: number }>(
        `INSERT INTO ${table} (name) VALUES ($1) RETURNING id`,
        [name],
      );
      return rows[0].id;
    },

    async rename(id: number, name: string, db: Queryable = pool) {
      await db.query(`UPDATE ${table} SET name = $2 WHERE id = $1`, [id, name]);
    },

    async remove(id: number, db: Queryable = pool) {
      await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    },
  };
}

export type NamedEntityRepository = ReturnType<typeof createNamedEntityRepository>;

export const authorRepository = createNamedEntityRepository({
  table: 'authors',
  bookCountSql: 'SELECT count(*) FROM book_authors ba WHERE ba.author_id = e.id',
});

export const publisherRepository = createNamedEntityRepository({
  table: 'publishers',
  bookCountSql: 'SELECT count(*) FROM books b WHERE b.publisher_id = e.id',
});
