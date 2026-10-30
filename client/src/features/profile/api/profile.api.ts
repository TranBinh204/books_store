import { getTokens, type AuthTokens } from '@/lib/auth-storage';
import { http } from '@/lib/http';
import type {
  ActiveSession,
  Address,
  AddressPayload,
  Profile,
  ProfileOverview,
  Province,
  UpdateProfilePayload,
} from '../types';

/** Refresh token của tab này → server nhận ra "thiết bị này" (gửi qua header, không đặt trên URL) */
function currentDeviceHeader(): Record<string, string> {
  const refreshToken = getTokens()?.refreshToken;
  return refreshToken ? { 'X-Refresh-Token': refreshToken } : {};
}

// ---------- Thông tin cá nhân ----------

export async function getProfile() {
  return (await http.get<Profile>('/me')).data;
}

export async function getOverview() {
  return (await http.get<ProfileOverview>('/me/overview')).data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  return (await http.patch<Profile>('/me', payload)).data;
}

/** Trả cặp token mới cho thiết bị này — các thiết bị khác bị đăng xuất */
export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  return (await http.post<{ tokens: AuthTokens }>('/me/change-password', payload)).data;
}

// ---------- Thiết bị đăng nhập ----------

export async function listSessions() {
  return (await http.get<ActiveSession[]>('/me/sessions', { headers: currentDeviceHeader() })).data;
}

export async function revokeSession(id: number) {
  await http.delete<void>(`/me/sessions/${id}`);
}

export async function revokeOtherSessions() {
  return (
    await http.post<{ revoked: number }>('/me/sessions/revoke-others', undefined, {
      headers: currentDeviceHeader(),
    })
  ).data;
}

// ---------- Sổ địa chỉ ----------

export async function listAddresses() {
  return (await http.get<Address[]>('/me/addresses')).data;
}

export async function createAddress(payload: AddressPayload) {
  return (await http.post<Address>('/me/addresses', payload)).data;
}

export async function updateAddress(id: number, payload: AddressPayload) {
  return (await http.patch<Address>(`/me/addresses/${id}`, payload)).data;
}

export async function setDefaultAddress(id: number) {
  return (await http.put<Address>(`/me/addresses/${id}/default`)).data;
}

export async function deleteAddress(id: number) {
  await http.delete<void>(`/me/addresses/${id}`);
}

// ---------- Địa giới hành chính (file tĩnh public/data/vn-locations.json) ----------

/** Định dạng gọn trong file: [mã tỉnh, tên tỉnh, [[mã phường, tên phường], ...]] */
type RawProvince = [number, string, [number, string][]];

export async function loadProvinces(): Promise<Province[]> {
  const res = await fetch('/data/vn-locations.json');
  if (!res.ok) throw new Error('Không tải được danh sách tỉnh / thành phố');
  const raw = (await res.json()) as RawProvince[];
  return raw.map(([code, name, wards]) => ({
    code,
    name,
    wards: wards.map(([wardCode, wardName]) => ({ code: wardCode, name: wardName })),
  }));
}
