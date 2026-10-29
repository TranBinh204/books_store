import { clearTokens, getTokens } from '@/lib/auth-storage';
import { ApiError, http } from '@/lib/http';
import type {
  CurrentUser,
  LoginPayload,
  LoginResponse,
  MessageResponse,
  RegisterOtpSent,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyRegisterPayload,
} from '../types/auth.types';

/** Trả về user + cặp token — hook useLogin tự lưu token vào storage */
export async function login(payload: LoginPayload) {
  return (await http.post<LoginResponse>('/auth/login', payload)).data;
}

/** Đăng ký bước 1: server lưu tạm + gửi mã OTP qua email (CHƯA tạo tài khoản) */
export async function register(payload: RegisterPayload) {
  return (await http.post<RegisterOtpSent>('/auth/register', payload)).data;
}

/** Đăng ký bước 2: nhập đúng mã → tạo tài khoản (không tự đăng nhập) */
export async function verifyRegister(payload: VerifyRegisterPayload) {
  return (await http.post<CurrentUser>('/auth/register/verify', payload)).data;
}

export async function resendRegisterOtp(email: string) {
  return (await http.post<RegisterOtpSent>('/auth/register/resend', { email })).data;
}

/** Huỷ phiên hiện tại ở server (bỏ qua lỗi — client vẫn xoá token) */
export async function logout(refreshToken: string) {
  await http.post<void>('/auth/logout', { refreshToken }).catch(() => undefined);
}

/** Người dùng hiện tại; chưa đăng nhập → null (không coi là lỗi) */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!getTokens()) return null;
  try {
    return (await http.get<CurrentUser>('/auth/me')).data;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      // 401: refresh đã thất bại (đã xoá token) · 403: tài khoản bị khoá → xoá token
      clearTokens();
      return null;
    }
    throw err;
  }
}

export async function forgotPassword(email: string) {
  return (await http.post<MessageResponse>('/auth/forgot-password', { email })).data;
}

export async function verifyResetToken(token: string) {
  return (await http.get<{ valid: boolean }>('/auth/reset-password/verify', { query: { token } }))
    .data;
}

export async function resetPassword(payload: ResetPasswordPayload) {
  return (await http.post<MessageResponse>('/auth/reset-password', payload)).data;
}
