import { pool, type Queryable } from '../db/pool';

export interface PasswordReset {
  id: number;
  userId: number;
  expiresAt: Date;
  usedAt: Date | null;
}

const COLUMNS = `id, user_id AS "userId", expires_at AS "expiresAt", used_at AS "usedAt"`;

/** Vô hiệu mọi token chưa dùng của user (khi tạo yêu cầu mới hoặc đặt lại mật khẩu xong) */
export async function invalidateUnusedByUser(userId: number, db: Queryable = pool): Promise<void> {
  await db.query(
    'UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
    [userId],
  );
}

export async function create(
  userId: number,
  tokenHash: string,
  expiresAt: Date,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt],
  );
}

/** Tìm token còn hiệu lực (chưa dùng, chưa hết hạn). `forUpdate` khoá dòng khi dùng trong transaction */
export async function findValidByHash(
  tokenHash: string,
  db: Queryable = pool,
  forUpdate = false,
): Promise<PasswordReset | null> {
  const { rows } = await db.query<PasswordReset>(
    `SELECT ${COLUMNS} FROM password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [tokenHash],
  );
  return rows[0] ?? null;
}
