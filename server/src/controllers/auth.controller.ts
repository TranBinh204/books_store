import type { Request, Response } from 'express';
import type {
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyRegisterInput,
} from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import * as passwordResetService from '../services/password-reset.service';
import * as registrationService from '../services/registration.service';
import * as sessionService from '../services/session.service';
import type { SessionMeta } from '../services/session.service';
import { sendSuccess } from '../utils/response';

function sessionMeta(req: Request): SessionMeta {
  return { userAgent: req.get('user-agent') ?? null, ip: req.ip ?? null };
}

/** Bước 1 đăng ký: lưu tạm + gửi mã OTP qua email (CHƯA tạo tài khoản) */
export async function register(req: Request, res: Response) {
  const sent = await registrationService.startRegistration(req.body as RegisterInput);
  return sendSuccess(res, sent);
}

/** Bước 2 đăng ký: nhập đúng mã → tạo tài khoản (không tự đăng nhập) */
export async function verifyRegister(req: Request, res: Response) {
  const user = await registrationService.verifyRegistration(req.body as VerifyRegisterInput);
  return sendSuccess(res, user, 201);
}

export async function resendRegisterOtp(req: Request, res: Response) {
  const sent = await registrationService.resendRegistrationOtp(
    (req.body as { email: string }).email,
  );
  return sendSuccess(res, sent);
}

/** Trả về user + cặp token trong body — client tự lưu (localStorage / sessionStorage) */
export async function login(req: Request, res: Response) {
  const session = await authService.login(req.body as LoginInput, sessionMeta(req));
  return sendSuccess(res, session);
}

/** Đổi refresh token lấy cặp token mới (xoay vòng) */
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as RefreshTokenInput;
  const session = await sessionService.rotateSession(refreshToken, sessionMeta(req));
  return sendSuccess(res, session);
}

/** Huỷ phiên của refresh token gửi lên (không cần access token còn hạn) */
export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body as Partial<RefreshTokenInput>;
  if (refreshToken) await sessionService.revokeSession(refreshToken);
  return res.status(204).end();
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id);
  return sendSuccess(res, user);
}

export async function forgotPassword(req: Request, res: Response) {
  await passwordResetService.requestPasswordReset((req.body as { email: string }).email);
  return sendSuccess(res, { message: passwordResetService.FORGOT_PASSWORD_MESSAGE });
}

export async function verifyResetToken(req: Request, res: Response) {
  await passwordResetService.verifyResetToken((req.query as { token: string }).token);
  return sendSuccess(res, { valid: true });
}

export async function resetPassword(req: Request, res: Response) {
  await passwordResetService.resetPassword(req.body as ResetPasswordInput);
  return sendSuccess(res, { message: 'Đặt lại mật khẩu thành công' });
}
