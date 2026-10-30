import { pool, type Queryable } from '../db/pool';
import type { AddressInput } from '../schemas/address.schema';
import type { Address } from '../types/address.types';

const COLUMNS = `
  id,
  recipient_name AS "recipientName",
  phone,
  province_code  AS "provinceCode",
  province,
  ward_code      AS "wardCode",
  ward,
  detail,
  is_default     AS "isDefault",
  created_at     AS "createdAt",
  updated_at     AS "updatedAt"
`;

/** Mặc định đứng đầu, rồi mới nhất */
export async function listByUser(userId: number, db: Queryable = pool): Promise<Address[]> {
  const { rows } = await db.query<Address>(
    `SELECT ${COLUMNS} FROM addresses WHERE user_id = $1
     ORDER BY is_default DESC, created_at DESC, id DESC`,
    [userId],
  );
  return rows;
}

/** Chỉ tìm trong địa chỉ của chính người dùng (của người khác → null, không lộ việc tồn tại) */
export async function findOwned(
  userId: number,
  id: number,
  db: Queryable = pool,
  forUpdate = false,
): Promise<Address | null> {
  const { rows } = await db.query<Address>(
    `SELECT ${COLUMNS} FROM addresses WHERE id = $1 AND user_id = $2 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id, userId],
  );
  return rows[0] ?? null;
}

export async function countByUser(userId: number, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM addresses WHERE user_id = $1',
    [userId],
  );
  return rows[0].count;
}

/**
 * Khoá theo người dùng tới hết transaction — các thao tác thêm / xoá / đổi mặc định
 * của cùng 1 người chạy lần lượt (đảm bảo giới hạn số địa chỉ & đúng 1 địa chỉ mặc định).
 */
export async function lockUser(userId: number, db: Queryable) {
  await db.query(`SELECT pg_advisory_xact_lock(hashtext('addresses:' || $1::text))`, [userId]);
}

type AddressFields = Omit<AddressInput, 'isDefault'>;

const fieldValues = (input: AddressFields) => [
  input.recipientName,
  input.phone,
  input.provinceCode,
  input.province,
  input.wardCode,
  input.ward,
  input.detail,
];

export async function insert(
  userId: number,
  input: AddressFields & { isDefault: boolean },
  db: Queryable = pool,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO addresses
       (recipient_name, phone, province_code, province, ward_code, ward, detail, is_default, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [...fieldValues(input), input.isDefault, userId],
  );
  return rows[0].id;
}

export async function update(id: number, input: AddressFields, db: Queryable = pool) {
  await db.query(
    `UPDATE addresses SET recipient_name = $1, phone = $2, province_code = $3, province = $4,
       ward_code = $5, ward = $6, detail = $7
     WHERE id = $8`,
    [...fieldValues(input), id],
  );
}

/** Bỏ mặc định hiện tại rồi đặt `id` làm mặc định (gọi trong transaction đã khoá người dùng) */
export async function setDefault(userId: number, id: number, db: Queryable) {
  await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1 AND is_default', [
    userId,
  ]);
  await db.query('UPDATE addresses SET is_default = true WHERE id = $1', [id]);
}

/** Địa chỉ mới nhất còn lại (để chuyển mặc định sau khi xoá) */
export async function findNewestId(userId: number, db: Queryable): Promise<number | null> {
  const { rows } = await db.query<{ id: number }>(
    'SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1',
    [userId],
  );
  return rows[0]?.id ?? null;
}

export async function remove(id: number, db: Queryable) {
  await db.query('DELETE FROM addresses WHERE id = $1', [id]);
}
