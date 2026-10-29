import { pool, type Queryable } from '../db/pool';
import type { CreateUserInput, User } from '../types/user.types';

const USER_COLUMNS = `
  id,
  full_name           AS "fullName",
  email,
  phone,
  password_hash       AS "passwordHash",
  role,
  avatar_url          AS "avatarUrl",
  to_char(birthday, 'YYYY-MM-DD') AS birthday,
  gender,
  is_active           AS "isActive",
  password_changed_at AS "passwordChangedAt",
  created_at          AS "createdAt",
  updated_at          AS "updatedAt"
`;

export async function findById(id: number, db: Queryable = pool): Promise<User | null> {
  const { rows } = await db.query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findByEmail(email: string, db: Queryable = pool): Promise<User | null> {
  const { rows } = await db.query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [
    email,
  ]);
  return rows[0] ?? null;
}

export async function existsByEmail(email: string, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
  return (rowCount ?? 0) > 0;
}

export async function existsAdmin(db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query(`SELECT 1 FROM users WHERE role = 'ADMIN' LIMIT 1`);
  return (rowCount ?? 0) > 0;
}

/** SĐT đã thuộc tài khoản khác? (`excludeUserId`: bỏ qua chính mình khi sửa hồ sơ) */
export async function existsByPhone(
  phone: string,
  excludeUserId?: number,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    'SELECT 1 FROM users WHERE phone = $1 AND ($2::int IS NULL OR id <> $2)',
    [phone, excludeUserId ?? null],
  );
  return (rowCount ?? 0) > 0;
}

export async function create(input: CreateUserInput, db: Queryable = pool): Promise<User> {
  const { rows } = await db.query<User>(
    `INSERT INTO users (full_name, email, phone, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${USER_COLUMNS}`,
    [input.fullName, input.email, input.phone, input.passwordHash, input.role ?? 'CUSTOMER'],
  );
  return rows[0];
}

export async function updatePassword(
  userId: number,
  passwordHash: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query('UPDATE users SET password_hash = $2, password_changed_at = now() WHERE id = $1', [
    userId,
    passwordHash,
  ]);
}
