import { env } from '../config/env';
import { withTransaction } from '../db/transaction';
import {
  buildSystemPrompt,
  buildToolDefinitions,
  historyToMessages,
  languageHint,
  parseAssistantReply,
} from '../lib/ai/chat-prompt';
import { AiError, chatWithTools, type ChatMessage } from '../lib/ai/groq';
import { getFaqs } from '../lib/ai/store-policy';
import * as chatRepository from '../repositories/chat.repository';
import type { ChatMessageRow } from '../repositories/chat.repository';
import type { ChatHistoryQuery } from '../schemas/chat.schema';
import type { PublicBookListItem } from '../types/catalog.types';
import { AppError } from '../utils/AppError';
import { toPublicItem } from './book.service';
import { runTool } from './chat-tool.service';

// Chatbox tư vấn AI (F21) — docs/03-modules/16-chatbox.md mục 3 & 6
// AI chỉ nói chuyện; dữ liệu lấy từ DB qua công cụ chỉ-đọc; chỉ lưu hỏi – đáp.

/** Số công cụ tối đa AI được gọi trong 1 vòng (gọi nhiều hơn → báo lỗi cho AI) */
const MAX_TOOL_CALLS_PER_ROUND = 3;

export const BUSY_REPLY =
  'Trợ lý đang bận một chút, bạn thử lại sau ít phút nhé. Trong lúc chờ, bạn có thể bấm các câu hỏi có sẵn bên dưới.';

export interface ChatMessageDto {
  /** null: câu "đang bận" — không lưu DB */
  id: number | null;
  role: 'user' | 'assistant';
  content: string;
  books: PublicBookListItem[];
  createdAt: Date;
}

export interface SendMessageResult {
  /** ai: AI trả lời (đã lưu cả câu hỏi & câu trả lời) · busy: AI lỗi / hết lượt (không lưu gì) */
  source: 'ai' | 'busy';
  /** Câu hỏi đã lưu — null khi busy */
  question: ChatMessageDto | null;
  answer: ChatMessageDto;
}

/** Thẻ sách đọc lại từ DB cho mọi tin (1 truy vấn), giữ thứ tự id trong từng tin */
async function toDtos(rows: ChatMessageRow[]): Promise<ChatMessageDto[]> {
  const ids = [...new Set(rows.flatMap((row) => row.bookIds))];
  const cards = await chatRepository.findBookCards(ids);
  const byId = new Map(cards.map((card) => [card.id, toPublicItem(card)]));
  return rows.map((row) => ({
    id: row.id,
    role: row.role === 'USER' ? 'user' : 'assistant',
    content: row.content,
    books: row.bookIds.flatMap((id) => byId.get(id) ?? []),
    createdAt: row.createdAt,
  }));
}

/** Lịch sử chat (cũ → mới trong trang) + câu hỏi có sẵn. `hasMore` → gọi lại với `before` = id tin đầu tiên */
export async function getHistory(userId: number, query: ChatHistoryQuery) {
  const rows = await chatRepository.listByUser(userId, {
    before: query.before,
    limit: query.limit + 1,
  });
  const hasMore = rows.length > query.limit;
  const page = rows.slice(0, query.limit).reverse();
  return {
    aiEnabled: env.aiEnabled,
    /** Client giới hạn ô nhập theo cấu hình server (không ghi cứng) */
    maxMessageLength: env.CHAT_MAX_MESSAGE_LENGTH,
    faqs: getFaqs(),
    messages: await toDtos(page),
    hasMore,
  };
}

/**
 * Hỏi AI: lịch sử từ DB + tin mới → AI trả lời thẳng hoặc gọi công cụ (tối đa CHAT_MAX_TOOL_ROUNDS vòng)
 * → lọc sách AI giới thiệu (chỉ sách công cụ vừa trả). AI lỗi → null.
 */
async function askAi(
  userId: number,
  message: string,
): Promise<{ text: string; bookIds: number[] } | null> {
  const history =
    env.CHAT_HISTORY_MESSAGES > 0
      ? (await chatRepository.listByUser(userId, { limit: env.CHAT_HISTORY_MESSAGES })).reverse()
      : [];
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: buildSystemPrompt({
        searchLimit: env.CHAT_SEARCH_LIMIT,
        orderLimit: env.CHAT_ORDER_LIMIT,
      }),
    },
    ...historyToMessages(history),
    { role: 'user', content: message },
  ];
  const hint = languageHint(message);
  if (hint) messages.push(hint);
  const tools = buildToolDefinitions();
  /** Sách công cụ đã trả trong lượt này — chỉ những sách này được hiện thẻ */
  const allowedBooks = new Map<number, string>();

  try {
    for (let round = 0; ; round++) {
      const { content, toolCalls } = await chatWithTools(messages, tools, {
        allowTools: round < env.CHAT_MAX_TOOL_ROUNDS,
      });
      if (toolCalls.length === 0) {
        const reply = parseAssistantReply(content ?? '', allowedBooks, env.CHAT_SEARCH_LIMIT);
        return reply.text ? reply : null;
      }

      messages.push({ role: 'assistant', content, tool_calls: toolCalls });
      for (const [index, call] of toolCalls.entries()) {
        let result: unknown = { error: 'TOO_MANY_TOOL_CALLS' };
        if (index < MAX_TOOL_CALLS_PER_ROUND) {
          const output = await runTool(call.function.name, call.function.arguments, { userId });
          output.books.forEach((title, id) => allowedBooks.set(id, title));
          result = output.result;
        }
        // Mọi tool_call đều phải có kết quả, kể cả bị từ chối — thiếu thì API báo lỗi
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }
  } catch (err) {
    if (!(err instanceof AiError)) throw err;
    console.error('Chatbox AI thất bại:', err.message);
    return null;
  }
}

/** Gửi 1 tin. Chỉ khi AI trả lời được mới lưu cả câu hỏi & câu trả lời (không để câu hỏi "treo") */
export async function sendMessage(userId: number, message: string): Promise<SendMessageResult> {
  if (!env.aiEnabled) {
    throw new AppError(
      503,
      'AI_UNAVAILABLE',
      'Trợ lý AI đang tạm tắt, bạn dùng các câu hỏi có sẵn nhé',
    );
  }

  const reply = await askAi(userId, message);
  if (!reply) {
    return {
      source: 'busy',
      question: null,
      answer: {
        id: null,
        role: 'assistant',
        content: BUSY_REPLY,
        books: [],
        createdAt: new Date(),
      },
    };
  }

  const rows = await withTransaction(async (client) => [
    await chatRepository.insert(userId, { role: 'USER', content: message }, client),
    await chatRepository.insert(
      userId,
      { role: 'ASSISTANT', content: reply.text, bookIds: reply.bookIds },
      client,
    ),
  ]);
  const [question, answer] = await toDtos(rows);
  return { source: 'ai', question, answer };
}

/** Xoá cuộc trò chuyện của tôi */
export async function clearHistory(userId: number): Promise<void> {
  await chatRepository.deleteByUser(userId);
}

/** Job: xoá tin cũ hơn CHAT_RETENTION_DAYS ngày */
export function purgeOldMessages(): Promise<number> {
  return chatRepository.deleteOlderThan(env.CHAT_RETENTION_DAYS);
}
