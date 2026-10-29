import { randomInt } from 'node:crypto';
import { env } from '../config/env';
import type { Queryable } from '../db/pool';
import { withTransaction } from '../db/transaction';
import { registerOtpEmail } from '../lib/email-templates/register-otp';
import { sendMail } from '../lib/mailer';
import * as pendingRepository from '../repositories/pending-registration.repository';
import * as userRepository from '../repositories/user.repository';
import type { RegisterInput, VerifyRegisterInput } from '../schemas/auth.schema';
import { toPublicUser, type PublicUser } from '../types/user.types';
import { AppError } from '../utils/AppError';
import { hashPassword } from '../utils/password';
import { hashToken } from '../utils/token';

// Đăng ký 2 bước (F01): gửi form → nhận OTP qua email → nhập đúng OTP mới tạo tài khoản.
// Chưa xác minh = chưa có tài khoản (dữ liệu nằm tạm ở pending_registrations).

export interface OtpSent {
  email: string;
  expiresInMinutes: number;
  resendAfterSeconds: number;
}

/** Mã 6 số ngẫu nhiên (có thể bắt đầu bằng 0) */
function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Băm kèm email → cùng một mã ở 2 email khác nhau cho bản băm khác nhau */
function hashOtp(email: string, otp: string): string {
  return hashToken(`${email}:${otp}`);
}

function otpExpiresAt(): Date {
  return new Date(Date.now() + env.REGISTER_OTP_TTL_MINUTES * 60 * 1000);
}

function otpSent(email: string): OtpSent {
  return {
    email,
    expiresInMinutes: env.REGISTER_OTP_TTL_MINUTES,
    resendAfterSeconds: env.REGISTER_OTP_RESEND_COOLDOWN_SECONDS,
  };
}

/** Còn phải đợi bao nhiêu giây mới được gửi lại mã (0 = gửi được) */
function cooldownLeftSeconds(lastSentAt: Date): number {
  const elapsed = (Date.now() - lastSentAt.getTime()) / 1000;
  return Math.max(0, Math.ceil(env.REGISTER_OTP_RESEND_COOLDOWN_SECONDS - elapsed));
}

function resendTooSoonError(seconds: number) {
  return new AppError(
    429,
    'OTP_RESEND_TOO_SOON',
    `Vui lòng đợi ${seconds} giây rồi gửi lại mã xác minh`,
  );
}

function registrationNotFoundError() {
  return new AppError(
    400,
    'REGISTRATION_NOT_FOUND',
    'Yêu cầu đăng ký không tồn tại hoặc đã bị huỷ, vui lòng đăng ký lại',
  );
}

/** Email / SĐT đã thuộc một tài khoản → 409 */
async function assertEmailAndPhoneAvailable(email: string, phone: string, db?: Queryable) {
  if (await userRepository.existsByEmail(email, db)) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Email đã được sử dụng', [
      { field: 'email', message: 'Email đã được sử dụng' },
    ]);
  }
  if (await userRepository.existsByPhone(phone, undefined, db)) {
    throw new AppError(409, 'PHONE_EXISTS', 'Số điện thoại đã được sử dụng', [
      { field: 'phone', message: 'Số điện thoại đã được sử dụng' },
    ]);
  }
}

async function sendOtpMail(email: string, fullName: string, otp: string) {
  try {
    await sendMail(
      registerOtpEmail({
        to: email,
        fullName,
        otp,
        expiresInMinutes: env.REGISTER_OTP_TTL_MINUTES,
      }),
    );
  } catch (err) {
    console.error('Gửi email mã xác minh đăng ký thất bại:', err);
    throw new AppError(
      503,
      'EMAIL_SEND_FAILED',
      'Không gửi được email xác minh, vui lòng thử lại sau',
    );
  }
}

/** Bước 1: lưu tạm thông tin đăng ký + gửi OTP. Đăng ký lại cùng email → ghi đè bản cũ */
export async function startRegistration(input: RegisterInput): Promise<OtpSent> {
  await assertEmailAndPhoneAvailable(input.email, input.phone);

  const existing = await pendingRepository.findByEmail(input.email);
  if (existing) {
    const wait = cooldownLeftSeconds(existing.lastSentAt);
    if (wait > 0) throw resendTooSoonError(wait);
  }

  const otp = generateOtp();
  await pendingRepository.upsert({
    email: input.email,
    fullName: input.fullName,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
    otpHash: hashOtp(input.email, otp),
    otpExpiresAt: otpExpiresAt(),
  });

  await sendOtpMail(input.email, input.fullName, otp);
  return otpSent(input.email);
}

/** Gửi lại mã mới (mã cũ hết hiệu lực, số lần sai về 0) */
export async function resendRegistrationOtp(email: string): Promise<OtpSent> {
  const otp = generateOtp();

  const pending = await withTransaction(async (client) => {
    const row = await pendingRepository.findByEmail(email, client, true);
    if (!row) throw registrationNotFoundError();
    const wait = cooldownLeftSeconds(row.lastSentAt);
    if (wait > 0) throw resendTooSoonError(wait);

    await pendingRepository.replaceOtp(email, hashOtp(email, otp), otpExpiresAt(), client);
    return row;
  });

  await sendOtpMail(email, pending.fullName, otp);
  return otpSent(email);
}

type VerifyOutcome = { ok: true; user: PublicUser } | { ok: false; error: AppError };

/**
 * Bước 2: nhập đúng OTP → tạo tài khoản (KHÔNG tự đăng nhập).
 * Nhập sai phải lưu lại số lần sai → transaction trả kết quả, lỗi ném ra SAU khi COMMIT.
 */
export async function verifyRegistration(input: VerifyRegisterInput): Promise<PublicUser> {
  const outcome = await withTransaction<VerifyOutcome>(async (client) => {
    // Khoá dòng → 2 request cùng lúc không thể dùng 1 mã hai lần / vượt số lần sai
    const pending = await pendingRepository.findByEmail(input.email, client, true);
    if (!pending) throw registrationNotFoundError();

    if (pending.otpExpiresAt.getTime() <= Date.now()) {
      throw new AppError(400, 'OTP_EXPIRED', 'Mã xác minh đã hết hạn, vui lòng gửi lại mã mới');
    }

    if (hashOtp(input.email, input.otp) !== pending.otpHash) {
      const attempts = await pendingRepository.incrementAttempts(input.email, client);
      const left = env.REGISTER_OTP_MAX_ATTEMPTS - attempts;
      if (left <= 0) {
        await pendingRepository.deleteByEmail(input.email, client);
        return {
          ok: false,
          error: new AppError(
            400,
            'OTP_TOO_MANY_ATTEMPTS',
            'Bạn đã nhập sai mã quá số lần cho phép, vui lòng đăng ký lại',
          ),
        };
      }
      return {
        ok: false,
        error: new AppError(400, 'INVALID_OTP', `Mã xác minh không đúng (còn ${left} lần thử)`, [
          { field: 'otp', message: `Mã xác minh không đúng (còn ${left} lần thử)` },
        ]),
      };
    }

    // Trong lúc chờ xác minh, email / SĐT có thể đã bị tài khoản khác dùng
    try {
      await assertEmailAndPhoneAvailable(pending.email, pending.phone, client);
    } catch (err) {
      await pendingRepository.deleteByEmail(input.email, client);
      return { ok: false, error: err as AppError };
    }

    const user = await userRepository.create(
      {
        fullName: pending.fullName,
        email: pending.email,
        phone: pending.phone,
        passwordHash: pending.passwordHash,
      },
      client,
    );
    await pendingRepository.deleteByEmail(input.email, client);
    return { ok: true, user: toPublicUser(user) };
  });

  if (!outcome.ok) throw outcome.error;
  return outcome.user;
}
