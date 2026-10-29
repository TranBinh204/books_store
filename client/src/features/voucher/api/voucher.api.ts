import { http } from '@/lib/http';
import type { PublicVoucher, VoucherCheckResult } from '../types';

/** Mã công khai cho trang chủ — dùng ở Server Component, luôn lấy mới (mã hết hạn / hết lượt) */
export async function listPublicVouchers() {
  return (await http.get<PublicVoucher[]>('/vouchers', { cache: 'no-store' })).data;
}

/** Kiểm tra mã với giỏ hàng của tôi (trên server) */
export async function checkVoucher(code: string) {
  return (await http.post<VoucherCheckResult>('/me/vouchers/check', { code })).data;
}
