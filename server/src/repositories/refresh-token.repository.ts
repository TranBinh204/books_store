import { pool, type Queryable } from '../db/pool';

export interface RefreshToken {
  id: number;
  userId: number;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: number | null;
}

const COLUMNS = `
  id,
  user_id        AS "userId",
  expires_at     AS "expiresAt",
  revoked_at     AS "revokedAt",
  replaced_by_id AS "replacedById"
`;

export interface CreateRefreshTokenInput {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  userAgent: string | null;
  ip: string | null;
}

export async function create(
  input: CreateRefreshTokenInput,
  db: Queryable = pool,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [input.userId, input.tokenHash, input.expiresAt, input.userAgent, input.ip],
  );
  return rows[0].id;
}

/** Tìm theo bản băm (kể cả đã huỷ / hết hạn). `forUpdate` khoá dòng trong transaction */
export async function findByHash(
  tokenHash: string,
  db: Queryable = pool,
  forUpdate = false,
): Promise<RefreshToken | null> {
  const { rows } = await db.query<RefreshToken>(
    `SELECT ${COLUMNS} FROM refresh_tokens WHERE token_hash = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

/** Huỷ 1 token; `replacedById` = token mới khi xoay vòng */
export async function revoke(
  id: number,
  replacedById: number | null = null,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = now(), replaced_by_id = $2
     WHERE id = $1 AND revoked_at IS NULL`,
    [id, replacedById],
  );
}

export async function revokeByHash(tokenHash: string, db: Queryable = pool): Promise<void> {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL',
    [tokenHash],
  );
}

export interface ActiveSessionRow {
  id: number;
  userAgent: string | null;
  ip: string | null;
  /** Lần cấp gần nhất (đăng nhập hoặc làm mới phiên) ≈ hoạt động gần nhất */
  createdAt: Date;
}

/** Phiên còn hiệu lực của user (chưa huỷ, chưa hết hạn), mới nhất trước */
export async function listActiveByUser(
  userId: number,
  db: Queryable = pool,
): Promise<ActiveSessionRow[]> {
  const { rows } = await db.query<ActiveSessionRow>(
    `SELECT id, user_agent AS "userAgent", ip, created_at AS "createdAt"
     FROM refresh_tokens
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC, id DESC`,
    [userId],
  );
  return rows;
}

/** Huỷ 1 phiên của chính user. Trả về false nếu không có (hoặc của người khác / đã huỷ) */
export async function revokeOwned(userId: number, id: number, db: Queryable = pool) {
  const { rowCount } = await db.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > now()`,
    [id, userId],
  );
  return (rowCount ?? 0) > 0;
}

/** Huỷ mọi phiên của user trừ phiên `keepId` (null → huỷ tất cả). Trả về số phiên đã huỷ */
export async function revokeAllExcept(userId: number, keepId: number | null, db: Queryable = pool) {
  const { rowCount } = await db.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE user_id = $1 AND revoked_at IS NULL AND ($2::int IS NULL OR id <> $2)`,
    [userId, keepId],
  );
  return rowCount ?? 0;
}

/** Huỷ mọi phiên của user (đổi mật khẩu, phát hiện token bị đánh cắp) */
export async function revokeAllByUser(userId: number, db: Queryable = pool): Promise<void> {
  await db.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
}
