import { pool, type Queryable } from '../db/pool';
import type { CustomerListQuery } from '../schemas/customer.schema';
import type { CustomerDetail, CustomerRow } from '../types/customer.types';
import type { CreateUserInput, User } from '../types/user.types';
import { offsetOf, type PageParams } from '../utils/pagination';

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

export interface ProfileFields {
  fullName: string;
  phone: string | null;
  birthday: string | null;
  gender: User['gender'];
}

export async function updateProfile(id: number, fields: ProfileFields, db: Queryable = pool) {
  await db.query(
    'UPDATE users SET full_name = $2, phone = $3, birthday = $4, gender = $5 WHERE id = $1',
    [id, fields.fullName, fields.phone, fields.birthday, fields.gender],
  );
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

// ---------- Admin quản lý khách hàng (M08) ----------

/** Số đơn + tổng tiền đơn Đã giao của mỗi khách */
const CUSTOMER_STATS_JOIN = `
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS "orderCount",
      COALESCE(sum(o.total) FILTER (WHERE o.status = 'DELIVERED'), 0)::bigint AS "totalSpent",
      max(o.created_at) AS "lastOrderAt"
    FROM orders o WHERE o.user_id = u.id
  ) st ON true`;

const CUSTOMER_COLUMNS = `
  u.id, u.full_name AS "fullName", u.email, u.phone, u.avatar_url AS "avatarUrl",
  u.is_active AS "isActive", u.created_at AS "createdAt",
  st."orderCount", st."totalSpent"`;

const CUSTOMER_SORTS: Record<CustomerListQuery['sort'], string> = {
  newest: 'u.created_at DESC, u.id DESC',
  spent: 'st."totalSpent" DESC, u.id DESC',
  orders: 'st."orderCount" DESC, u.id DESC',
};

export async function listCustomers(
  filters: {
    /** Đã escape ký tự đặc biệt của LIKE */
    keyword?: string;
    status?: CustomerListQuery['status'];
    sort: CustomerListQuery['sort'];
  },
  page: PageParams,
  db: Queryable = pool,
): Promise<{ items: CustomerRow[]; total: number }> {
  const { rows } = await db.query<CustomerRow & { totalRows: number }>(
    `SELECT ${CUSTOMER_COLUMNS}, count(*) OVER()::int AS "totalRows"
     FROM users u ${CUSTOMER_STATS_JOIN}
     WHERE u.role = 'CUSTOMER'
       AND ($1::boolean IS NULL OR u.is_active = $1)
       AND ($2::text IS NULL
            OR lower(f_unaccent(u.full_name)) LIKE '%' || lower(f_unaccent($2)) || '%'
            OR u.email ILIKE '%' || $2 || '%'
            OR u.phone LIKE '%' || $2 || '%')
     ORDER BY ${CUSTOMER_SORTS[filters.sort]}
     LIMIT $3 OFFSET $4`,
    [
      filters.status === undefined ? null : filters.status === 'active',
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

/** Hồ sơ + thống kê 1 khách (Admin → null). Chưa gồm sổ địa chỉ. `forUpdate` khoá dòng */
export async function findCustomer(
  id: number,
  db: Queryable = pool,
  forUpdate = false,
): Promise<Omit<CustomerDetail, 'addresses'> | null> {
  if (forUpdate) {
    const { rowCount } = await db.query(
      `SELECT 1 FROM users WHERE id = $1 AND role = 'CUSTOMER' FOR UPDATE`,
      [id],
    );
    if (!rowCount) return null;
  }
  const { rows } = await db.query<Omit<CustomerDetail, 'addresses'>>(
    `SELECT ${CUSTOMER_COLUMNS},
       to_char(u.birthday, 'YYYY-MM-DD') AS birthday, u.gender,
       u.locked_at AS "lockedAt", u.lock_reason AS "lockReason",
       st."lastOrderAt",
       COALESCE((SELECT json_object_agg(c.status, c.n) FROM (
         SELECT status, count(*)::int AS n FROM orders WHERE user_id = u.id GROUP BY status
       ) c), '{}'::json) AS "orderCounts"
     FROM users u ${CUSTOMER_STATS_JOIN}
     WHERE u.id = $1 AND u.role = 'CUSTOMER'`,
    [id],
  );
  return rows[0] ?? null;
}

/** Khoá (kèm lý do) / mở khoá tài khoản */
export async function setLocked(id: number, reason: string | null, db: Queryable = pool) {
  await db.query(
    `UPDATE users SET is_active = $2::text IS NULL,
       locked_at = CASE WHEN $2::text IS NULL THEN NULL ELSE now() END,
       lock_reason = $2
     WHERE id = $1`,
    [id, reason],
  );
}
