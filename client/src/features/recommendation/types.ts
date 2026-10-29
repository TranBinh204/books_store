import type { BookCardItem, IdName } from '@/features/catalog';

// Khớp server: services/preference.service.ts & recommendation.service.ts (M15)

export interface Preferences {
  /** false → hiện hộp thoại "Bạn thích đọc gì?" ở lần đăng nhập đầu */
  onboarded: boolean;
  categories: IdName[];
  authors: IdName[];
  note: string;
}

export interface SavePreferencesPayload {
  categoryIds: number[];
  authorIds: number[];
  note: string;
}

export interface Recommendation {
  book: BookCardItem;
  /** Lý do AI viết — null khi là gợi ý dự phòng */
  reason: string | null;
}

export interface RecommendationResult {
  /** ai: có lý do · fallback: AI tạm lỗi → gợi ý theo sở thích, không có lý do */
  source: 'ai' | 'fallback';
  generatedAt: string;
  items: Recommendation[];
}
