import { Pool, types, type PoolClient } from 'pg';
import { env } from '../config/env';

// BIGINT (int8, OID 20) mặc định trả về chuỗi → chuyển sang number.
// An toàn vì tiền VND luôn nhỏ hơn Number.MAX_SAFE_INTEGER.
types.setTypeParser(20, (value) => Number(value));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Lỗi kết nối PostgreSQL không mong muốn:', err);
});

/** Repository nhận `db` là pool (mặc định) hoặc client của transaction (withTransaction) */
export type Queryable = Pick<Pool | PoolClient, 'query'>;
