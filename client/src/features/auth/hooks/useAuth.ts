'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearTokens, getTokens, saveTokens } from '@/lib/auth-storage';
import * as authApi from '../api/auth.api';
import type { LoginPayload } from '../types/auth.types';

export const currentUserKey = ['auth', 'me'] as const;

/** Người dùng đang đăng nhập (null nếu chưa đăng nhập) */
export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: authApi.getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
}

/** Đăng nhập; `rememberMe` quyết định lưu token ở localStorage hay sessionStorage */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rememberMe, ...payload }: LoginPayload & { rememberMe: boolean }) => {
      const result = await authApi.login(payload);
      saveTokens(result.tokens, rememberMe);
      return result.user;
    },
    onSuccess: (user) => queryClient.setQueryData(currentUserKey, user),
  });
}

/** Đăng ký bước 1 — gửi mã OTP xác minh email */
export function useRegister() {
  return useMutation({ mutationFn: authApi.register });
}

/** Đăng ký bước 2 — nhập mã OTP; không lưu token, người dùng tự đăng nhập sau */
export function useVerifyRegister() {
  return useMutation({ mutationFn: authApi.verifyRegister });
}

export function useResendRegisterOtp() {
  return useMutation({ mutationFn: authApi.resendRegisterOtp });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const tokens = getTokens();
      clearTokens();
      if (tokens) await authApi.logout(tokens.refreshToken);
    },
    onSuccess: () => {
      // Xoá toàn bộ dữ liệu của phiên cũ
      queryClient.clear();
      queryClient.setQueryData(currentUserKey, null);
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useVerifyResetToken(token: string) {
  return useQuery({
    queryKey: ['auth', 'reset-token', token],
    queryFn: () => authApi.verifyResetToken(token),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}
