import type { BookCardItem } from '@/features/catalog';

// Khớp server: services/chat.service.ts (M16 – docs/03-modules/16-chatbox.md mục 5)

export interface ChatMessage {
  /** null: câu "đang bận" — không lưu DB */
  id: number | null;
  role: 'user' | 'assistant';
  content: string;
  /** Sách trợ lý giới thiệu — luôn đọc lại từ DB (giá hiện tại) */
  books: BookCardItem[];
  createdAt: string;
}

/** Câu hỏi có sẵn — trả lời tĩnh, không tốn lượt AI */
export interface ChatFaq {
  id: string;
  question: string;
  answer: string;
}

export interface ChatHistory {
  /** false: server chưa cấu hình AI → chỉ còn câu hỏi có sẵn */
  aiEnabled: boolean;
  maxMessageLength: number;
  faqs: ChatFaq[];
  /** Cũ → mới trong trang */
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface SendChatResult {
  /** ai: đã lưu cả câu hỏi & câu trả lời · busy: AI tạm lỗi, không lưu gì */
  source: 'ai' | 'busy';
  question: ChatMessage | null;
  answer: ChatMessage;
}
