import { env } from '../../config/env';

// Gọi Groq qua API chuẩn OpenAI (/chat/completions) bằng fetch có sẵn của Node — không cần thư viện.
// Đổi GROQ_BASE_URL / GROQ_MODEL là dùng được nhà cung cấp chuẩn OpenAI khác.

/** Yêu cầu gọi công cụ do AI trả về (M16) */
export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** Tin dạng chữ (system / user) — M15 gợi ý sách chỉ dùng loại này */
export interface TextMessage {
  role: 'system' | 'user';
  content: string;
}

export type ChatMessage =
  | TextMessage
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

/** Khai báo công cụ cho AI — `parameters` là JSON Schema */
export interface ToolDefinition {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatResult {
  content: string;
  model: string;
}

export interface ToolChatResult {
  /** Câu trả lời (null khi AI chỉ xin gọi công cụ) */
  content: string | null;
  toolCalls: ToolCall[];
  model: string;
}

export class AiError extends Error {
  constructor(
    message: string,
    /** HTTP status từ nhà cung cấp (429 = hết hạn mức), không có nếu lỗi mạng / quá giờ */
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

interface AssistantReply {
  content?: string | null;
  tool_calls?: ToolCall[];
}

/** Lỗi mạng chập chờn (`fetch failed`: DNS, mất kết nối…) → chờ rồi thử lại 1 lần cùng model */
const NETWORK_RETRY_DELAY_MS = 1000;

/** Lỗi mạng của fetch (không tính quá giờ — đã chờ đủ AI_TIMEOUT_MS thì không thử lại) */
const isNetworkError = (err: unknown): err is TypeError => err instanceof TypeError;

async function callModel(
  model: string,
  messages: ChatMessage[],
  options: Record<string, unknown>,
): Promise<AssistantReply> {
  const send = () =>
    fetch(`${env.GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        ...options,
        ...(env.GROQ_REASONING_EFFORT && { reasoning_effort: env.GROQ_REASONING_EFFORT }),
      }),
      signal: AbortSignal.timeout(env.AI_TIMEOUT_MS),
    });

  let res: Response;
  try {
    try {
      res = await send();
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn(
        `Không gọi được AI (${model}): ${err.message} → thử lại sau ${NETWORK_RETRY_DELAY_MS}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, NETWORK_RETRY_DELAY_MS));
      res = await send();
    }
  } catch (err) {
    throw new AiError(`Không gọi được AI (${model}): ${err instanceof Error ? err.message : err}`);
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    throw new AiError(`AI (${model}) trả lỗi ${res.status}: ${detail}`, res.status);
  }

  const body = (await res.json()) as { choices?: { message?: AssistantReply }[] };
  return body.choices?.[0]?.message ?? {};
}

/** Gọi model chính; lỗi (hết hạn mức, quá giờ…) → thử GROQ_FALLBACK_MODEL nếu có */
async function withFallback<T>(call: (model: string) => Promise<T>): Promise<T> {
  if (!env.aiEnabled) throw new AiError('Chưa cấu hình GROQ_API_KEY');
  try {
    return await call(env.GROQ_MODEL);
  } catch (err) {
    if (!env.GROQ_FALLBACK_MODEL || env.GROQ_FALLBACK_MODEL === env.GROQ_MODEL) throw err;
    console.warn(`${err instanceof Error ? err.message : err} → thử ${env.GROQ_FALLBACK_MODEL}`);
    return call(env.GROQ_FALLBACK_MODEL);
  }
}

/** AI trả JSON (M15 gợi ý sách) */
export function chatJson(messages: TextMessage[]): Promise<ChatResult> {
  return withFallback(async (model) => {
    const reply = await callModel(model, messages, { response_format: { type: 'json_object' } });
    if (!reply.content) throw new AiError(`AI (${model}) không trả nội dung`);
    return { content: reply.content, model };
  });
}

/**
 * AI trò chuyện có công cụ (M16 chatbox): AI trả lời thẳng, hoặc xin gọi công cụ.
 * `allowTools = false` → bắt AI trả lời bằng lời (vòng cuối, đã hết lượt gọi công cụ): KHÔNG gửi `tools`
 * + nhắc trả lời ngay. Không dùng `tool_choice: 'none'` — gpt-oss vẫn cố gọi công cụ → Groq báo 400
 * `tool_use_failed` (thử thật 2026-10-18).
 */
export function chatWithTools(
  messages: ChatMessage[],
  tools: ToolDefinition[],
  { allowTools = true } = {},
): Promise<ToolChatResult> {
  const finalMessages: ChatMessage[] = allowTools
    ? messages
    : [
        ...messages,
        {
          role: 'system',
          content:
            'Đã hết lượt tra cứu. Trả lời khách ngay bằng thông tin đã có ở trên, không gọi thêm công cụ.',
        },
      ];
  return withFallback(async (model) => {
    const reply = await callModel(
      model,
      finalMessages,
      allowTools ? { tools, tool_choice: 'auto' } : {},
    );
    const toolCalls = allowTools ? (reply.tool_calls ?? []) : [];
    if (!reply.content && toolCalls.length === 0) {
      throw new AiError(`AI (${model}) không trả nội dung`);
    }
    return { content: reply.content ?? null, toolCalls, model };
  });
}
