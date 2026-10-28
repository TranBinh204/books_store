import { pool } from '../../src/db/pool';

/** Xoá sạch dữ liệu mọi bảng (trừ bảng lịch sử migration), đặt lại id về 1 */
export async function resetDatabase() {
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'pgmigrations'`,
  );
  if (rows.length === 0) return;
  const tables = rows.map((row) => `"${row.tablename}"`).join(', ');
  await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}
