import { env } from '../../../src/config/env';
import { AiError, chatJson, chatWithTools, type ToolDefinition } from '../../../src/lib/ai/groq';

// M15 – gọi Groq (API chuẩn OpenAI): model chính lỗi → thử model dự phòng · M16 – gọi công cụ

const fetchMock = jest.fn();
const realFetch = global.fetch;

beforeAll(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterAll(() => {
  global.fetch = realFetch;
});
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

const ok = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
const fail = (status: number) => new Response('rate limited', { status });
const sentBody = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body as string);

describe('chatJson', () => {
  it('gọi /chat/completions với Bearer key, model chính, yêu cầu trả JSON', async () => {
    fetchMock.mockResolvedValueOnce(ok('{"items":[]}'));

    const result = await chatJson([{ role: 'user', content: 'xin chào' }]);

    expect(result).toEqual({ content: '{"items":[]}', model: env.GROQ_MODEL });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${env.GROQ_BASE_URL}/chat/completions`);
    expect(init.headers.Authorization).toBe('Bearer test-groq-key');
    expect(sentBody(0)).toMatchObject({
      model: env.GROQ_MODEL,
      response_format: { type: 'json_object' },
    });
  });

  it('model chính hết hạn mức (429) → thử model dự phòng', async () => {
    fetchMock.mockResolvedValueOnce(fail(429)).mockResolvedValueOnce(ok('{"items":[]}'));

    const result = await chatJson([{ role: 'user', content: 'x' }]);

    expect(result.model).toBe('test-fallback-model');
    expect(sentBody(1).model).toBe('test-fallback-model');
  });

  it('cả 2 model lỗi → AiError kèm status', async () => {
    fetchMock.mockResolvedValueOnce(fail(429)).mockResolvedValueOnce(fail(503));
    await expect(chatJson([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      name: 'AiError',
      status: 503,
    });
  });

  it('lỗi mạng chập chờn (fetch failed) → thử lại 1 lần cùng model, được thì không cần dự phòng', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(ok('{"items":[]}'));

    const result = await chatJson([{ role: 'user', content: 'x' }]);

    expect(result.model).toBe(env.GROQ_MODEL);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentBody(1).model).toBe(env.GROQ_MODEL);
    fetchMock.mockReset();
  });

  it('lỗi mạng / quá giờ → AiError', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));
    await expect(chatJson([{ role: 'user', content: 'x' }])).rejects.toBeInstanceOf(AiError);
    fetchMock.mockReset();
  });
});

describe('chatWithTools (M16)', () => {
  const tools: ToolDefinition[] = [
    {
      type: 'function',
      function: { name: 'list_my_orders', description: 'Đơn gần nhất', parameters: {} },
    },
  ];
  const toolCall = {
    id: 'call_1',
    type: 'function' as const,
    function: { name: 'list_my_orders', arguments: '{}' },
  };
  const reply = (message: object) =>
    new Response(JSON.stringify({ choices: [{ message }] }), { status: 200 });

  afterEach(() => fetchMock.mockReset());

  it('gửi danh sách công cụ, tool_choice auto, KHÔNG ép JSON → trả yêu cầu gọi công cụ', async () => {
    fetchMock.mockResolvedValueOnce(reply({ content: null, tool_calls: [toolCall] }));

    const result = await chatWithTools([{ role: 'user', content: 'đơn của tôi?' }], tools);

    expect(result).toEqual({ content: null, toolCalls: [toolCall], model: env.GROQ_MODEL });
    expect(sentBody(0)).toMatchObject({ tools, tool_choice: 'auto' });
    expect(sentBody(0).response_format).toBeUndefined();
  });

  it('allowTools = false → KHÔNG gửi tools (tránh lỗi tool_use_failed), nhắc trả lời ngay, bỏ tool_calls', async () => {
    fetchMock.mockResolvedValueOnce(
      reply({ content: 'Đây là đơn của bạn', tool_calls: [toolCall] }),
    );

    const result = await chatWithTools([{ role: 'user', content: 'x' }], tools, {
      allowTools: false,
    });

    expect(result.toolCalls).toEqual([]);
    expect(result.content).toBe('Đây là đơn của bạn');
    expect(sentBody(0).tools).toBeUndefined();
    expect(sentBody(0).tool_choice).toBeUndefined();
    expect(sentBody(0).messages.at(-1)).toMatchObject({ role: 'system' });
    expect(sentBody(0).messages.at(-1).content).toContain('không gọi thêm công cụ');
  });

  it('không có nội dung lẫn công cụ → thử model dự phòng → vẫn rỗng thì AiError', async () => {
    fetchMock.mockResolvedValueOnce(reply({ content: '' })).mockResolvedValueOnce(reply({}));
    await expect(chatWithTools([{ role: 'user', content: 'x' }], tools)).rejects.toBeInstanceOf(
      AiError,
    );
    expect(sentBody(1).model).toBe('test-fallback-model');
  });
});
