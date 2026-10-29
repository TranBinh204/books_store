import type { UserRole } from './express';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

/** Bản ghi đầy đủ trong DB (có password_hash) — chỉ dùng nội bộ server */
export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: UserRole;
  avatarUrl: string | null;
  birthday: string | null;
  gender: Gender | null;
  isActive: boolean;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Dữ liệu người dùng trả ra API — KHÔNG có password_hash */
export interface PublicUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
}

/** Hồ sơ đầy đủ cho trang Tài khoản của tôi (M04) */
export interface Profile extends PublicUser {
  birthday: string | null;
  gender: Gender | null;
  createdAt: Date;
}

export function toProfile(user: User): Profile {
  return {
    ...toPublicUser(user),
    birthday: user.birthday,
    gender: user.gender,
    createdAt: user.createdAt,
  };
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role?: UserRole;
}
