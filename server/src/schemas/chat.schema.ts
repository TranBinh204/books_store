import { z } from 'zod';
import { env } from '../config/env';
import { BOOK_SORTS_FOR_AI } from '../lib/ai/chat-prompt';
import { POLICY_TOPICS } from '../lib/ai/store-policy';
import { idSchema } from './common.schema';

// Chatbox tư vấn AI (M16) — request API + tham số AI truyền cho từng công cụ

export const sendChatMessageSchema = z.object({
  message: z
    .string({ error: 'Vui lòng nhập tin nhắn' })
    .trim()
    .min(1, 'Vui lòng nhập tin nhắn')
    .max(env.CHAT_MAX_MESSAGE_LENGTH, `Tin nhắn tối đa ${env.CHAT_MAX_MESSAGE_LENGTH} ký tự`),
});

/** Lịch sử: mới nhất trước, `before` = id tin cũ nhất đang có (tải thêm tin cũ hơn) */
export const chatHistoryQuerySchema = z.object({
  before: idSchema.optional(),
  limit: z.coerce.number().int().positive().max(100).default(env.CHAT_HISTORY_PAGE_SIZE),
});

export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
export type ChatHistoryQuery = z.infer<typeof chatHistoryQuerySchema>;

// ---------- Tham số công cụ (AI truyền — kiểm tra như dữ liệu người dùng) ----------

const price = z.number().int().min(0);

export const toolArgSchemas = {
  search_books: z.object({
    q: z.string().trim().max(100).optional(),
    categoryName: z.string().trim().max(100).optional(),
    minPrice: price.optional(),
    maxPrice: price.optional(),
    sort: z.enum(BOOK_SORTS_FOR_AI).optional(),
  }),
  get_book: z.object({ bookId: z.number().int().positive() }),
  list_categories: z.object({}),
  get_store_policy: z.object({ topic: z.enum(POLICY_TOPICS) }),
  recommend_for_me: z.object({}),
  list_my_orders: z.object({}),
};

export type ToolName = keyof typeof toolArgSchemas;
