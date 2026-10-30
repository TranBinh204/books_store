'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { currentUserKey } from '@/features/auth';
import { updateTokens } from '@/lib/auth-storage';
import * as profileApi from '../api/profile.api';
import type { AddressPayload } from '../types';

export const profileKeys = {
  profile: ['me', 'profile'] as const,
  sessions: ['me', 'sessions'] as const,
  addresses: ['me', 'addresses'] as const,
  overview: ['me', 'overview'] as const,
  provinces: ['locations', 'provinces'] as const,
};

// ---------- Thông tin cá nhân ----------

export function useProfile() {
  return useQuery({ queryKey: profileKeys.profile, queryFn: profileApi.getProfile });
}

export function useProfileOverview() {
  return useQuery({ queryKey: profileKeys.overview, queryFn: profileApi.getOverview });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.profile, profile);
      // Tên trên Header / menu tài khoản
      queryClient.invalidateQueries({ queryKey: currentUserKey });
    },
  });
}

/** Đổi mật khẩu → lưu cặp token mới (đúng nơi đang lưu: local / session) */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: ({ tokens }) => {
      updateTokens(tokens);
      queryClient.invalidateQueries({ queryKey: profileKeys.sessions });
    },
  });
}

// ---------- Thiết bị đăng nhập ----------

export function useSessions() {
  return useQuery({ queryKey: profileKeys.sessions, queryFn: profileApi.listSessions });
}

function useInvalidate(key: readonly string[]) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: key });
}

export function useRevokeSession() {
  return useMutation({
    mutationFn: profileApi.revokeSession,
    onSuccess: useInvalidate(profileKeys.sessions),
  });
}

export function useRevokeOtherSessions() {
  return useMutation({
    mutationFn: profileApi.revokeOtherSessions,
    onSuccess: useInvalidate(profileKeys.sessions),
  });
}

// ---------- Sổ địa chỉ ----------

/** `enabled: false` cho tài khoản Admin (không có sổ địa chỉ) */
export function useAddresses({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: profileKeys.addresses, queryFn: profileApi.listAddresses, enabled });
}

export function useSaveAddress() {
  return useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: AddressPayload }) =>
      id ? profileApi.updateAddress(id, payload) : profileApi.createAddress(payload),
    onSuccess: useInvalidate(profileKeys.addresses),
  });
}

export function useSetDefaultAddress() {
  return useMutation({
    mutationFn: profileApi.setDefaultAddress,
    onSuccess: useInvalidate(profileKeys.addresses),
  });
}

export function useDeleteAddress() {
  return useMutation({
    mutationFn: profileApi.deleteAddress,
    onSuccess: useInvalidate(profileKeys.addresses),
  });
}

/** 34 tỉnh / thành + phường / xã — file tĩnh, tải 1 lần mỗi phiên */
export function useProvinces() {
  return useQuery({
    queryKey: profileKeys.provinces,
    queryFn: profileApi.loadProvinces,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
