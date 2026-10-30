// Tài khoản của tôi (M04) — khớp server/src/types/user.types.ts (Profile), address.types.ts, session.service.ts

import type { UserRole } from '@/features/auth';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Profile {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  /** yyyy-mm-dd */
  birthday: string | null;
  gender: Gender | null;
  createdAt: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  birthday?: string | null;
  gender?: Gender | null;
}

export interface ActiveSession {
  id: number;
  /** null = không nhận ra */
  browser: string | null;
  os: string | null;
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET';
  ip: string | null;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface Address {
  id: number;
  recipientName: string;
  phone: string;
  provinceCode: number;
  province: string;
  wardCode: number;
  ward: string;
  detail: string;
  isDefault: boolean;
}

export type AddressPayload = Omit<Address, 'id' | 'isDefault'> & { isDefault: boolean };

/** Địa giới hành chính (2 cấp, từ 01/07/2025) */
export interface Ward {
  code: number;
  name: string;
}

export interface Province extends Ward {
  wards: Ward[];
}

/** Số liệu nhanh ở thẻ danh tính (GET /me/overview) */
export interface ProfileOverview {
  orderCount: number;
  wishlistCount: number;
}
