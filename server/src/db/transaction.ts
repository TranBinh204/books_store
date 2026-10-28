import type { PoolClient } from 'pg';
import { pool } from './pool';

/**
 * Chạy `callback` trong một transaction.
 * Thành công → COMMIT, có lỗi → ROLLBACK rồi ném lỗi ra ngoài.
 */
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
