export type UserRole = 'CUSTOMER' | 'ADMIN';

/** Người dùng hiện tại — khớp PublicUser của server */
export interface CurrentUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: CurrentUser;
  tokens: { accessToken: string; refreshToken: string };
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

/** Server đã lưu tạm thông tin đăng ký và gửi mã OTP tới email */
export interface RegisterOtpSent {
  email: string;
  expiresInMinutes: number;
  resendAfterSeconds: number;
}

export interface VerifyRegisterPayload {
  email: string;
  otp: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}
