import { pool, type Queryable } from '../db/pool';

export interface PendingRegistration {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  otpHash: string;
  otpExpiresAt: Date;
  attempts: number;
  lastSentAt: Date;
}

const COLUMNS = `
  id, email, full_name AS "fullName", phone, password_hash AS "passwordHash",
  otp_hash AS "otpHash", otp_expires_at AS "otpExpiresAt", attempts, last_sent_at AS "lastSentAt"`;

export interface UpsertPendingInput {
  email: string;
  fullName: string;
  phone: string;
  passwordHash: string;
  otpHash: string;
  otpExpiresAt: Date;
}

/** Tạo mới hoặc ghi đè đăng ký chờ xác minh của email (đếm sai về 0, tính lại giờ gửi) */
export async function upsert(input: UpsertPendingInput, db: Queryable = pool): Promise<void> {
  await db.query(
    `INSERT INTO pending_registrations (email, full_name, phone, password_hash, otp_hash, otp_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name, phone = EXCLUDED.phone,
       password_hash = EXCLUDED.password_hash, otp_hash = EXCLUDED.otp_hash,
       otp_expires_at = EXCLUDED.otp_expires_at, attempts = 0, last_sent_at = now(),
       created_at = now()`,
    [
      input.email,
      input.fullName,
      input.phone,
      input.passwordHash,
      input.otpHash,
      input.otpExpiresAt,
    ],
  );
}

/** `forUpdate` khoá dòng khi dùng trong transaction */
export async function findByEmail(
  email: string,
  db: Queryable = pool,
  forUpdate = false,
): Promise<PendingRegistration | null> {
  const { rows } = await db.query<PendingRegistration>(
    `SELECT ${COLUMNS} FROM pending_registrations WHERE email = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [email],
  );
  return rows[0] ?? null;
}

/** Gửi mã mới: thay mã, đếm sai về 0 */
export async function replaceOtp(
  email: string,
  otpHash: string,
  otpExpiresAt: Date,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE pending_registrations
     SET otp_hash = $2, otp_expires_at = $3, attempts = 0, last_sent_at = now()
     WHERE email = $1`,
    [email, otpHash, otpExpiresAt],
  );
}

/** Tăng số lần nhập sai → trả về số lần sai hiện tại */
export async function incrementAttempts(email: string, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ attempts: number }>(
    'UPDATE pending_registrations SET attempts = attempts + 1 WHERE email = $1 RETURNING attempts',
    [email],
  );
  return rows[0]?.attempts ?? 0;
}

export async function deleteByEmail(email: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM pending_registrations WHERE email = $1', [email]);
}
