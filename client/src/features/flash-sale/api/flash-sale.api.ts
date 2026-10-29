import { http } from '@/lib/http';
import type { CurrentFlashSale, UpcomingFlashSale } from '../types';

/** Chương trình đang chạy — null nếu không có. Luôn lấy mới (suất thay đổi liên tục) */
export async function getCurrentFlashSale() {
  return (await http.get<CurrentFlashSale | null>('/flash-sales/current', { cache: 'no-store' }))
    .data;
}

/** Đợt sắp diễn ra sớm nhất — null nếu chưa có đợt nào được lên lịch */
export async function getUpcomingFlashSale() {
  return (await http.get<UpcomingFlashSale | null>('/flash-sales/upcoming', { cache: 'no-store' }))
    .data;
}
