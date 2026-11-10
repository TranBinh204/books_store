import request from 'supertest';
import { app } from '../../src/app';
import { env } from '../../src/config/env';
import { pool } from '../../src/db/pool';
import * as groq from '../../src/lib/ai/groq';
import { purgeOldMessages } from '../../src/services/chat.service';
import { loginAsAdmin } from '../helpers/admin';
import { resetDatabase } from '../helpers/db';
import { createBook, newCustomer, placeOrder } from '../helpers/shop';

// M16 – Chatbox tư vấn AI (docs/03-modules/16-chatbox.md). AI được giả lập — không gọi Groq thật

jest.mock('../../src/lib/mailer');
jest.mock('../../src/lib/ai/groq', () => ({
  ...jest.requireActual('../../src/lib/ai/groq'),
  chatWithTools: jest.fn(),
}));
const chatWithTools = jest.mocked(groq.chatWithTools);

beforeEach(async () => {
  await resetDatabase();
  chatWithTools.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterAll(async () => {
  await pool.end();
});

const api = (auth: string) => ({
  history: (query = '') => request(app).get(`/api/me/chat${query}`).set('Authorization', auth),
  send: (message: unknown) =>
    request(app).post('/api/me/chat').set('Authorization', auth).send({ message }),
  clear: () => request(app).delete('/api/me/chat').set('Authorization', auth),
});

/** AI trả lời thẳng */
const answer = (content: string) => ({ content, toolCalls: [], model: 'test-model' });
/** AI xin gọi công cụ */
const callTool = (name: string, args: object = {}, id = `call_${name}`) => ({
  content: null,
  toolCalls: [
    { id, type: 'function' as const, function: { name, arguments: JSON.stringify(args) } },
  ],
  model: 'test-model',
});

/** Tin gửi AI ở lần gọi thứ `call` */
const sentMessages = (call: number) => chatWithTools.mock.calls[call][0];
/** Kết quả công cụ (JSON) server gửi lại AI ở lần gọi thứ `call` */
const toolResults = (call: number) =>
  sentMessages(call)
    .filter((message) => message.role === 'tool')
    .map((message) => JSON.parse(message.content as string));

async function insertMessage(userId: number, role: 'USER' | 'ASSISTANT', content: string) {
  await pool.query('INSERT INTO chat_messages (user_id, role, content) VALUES ($1, $2, $3)', [
    userId,
    role,
    content,
  ]);
}

describe('Quyền (Q1 – bắt buộc đăng nhập)', () => {
  it('chưa đăng nhập → 401 · Admin → 403', async () => {
    expect((await request(app).get('/api/me/chat')).status).toBe(401);
    expect((await request(app).post('/api/me/chat').send({ message: 'hi' })).status).toBe(401);
    const admin = await loginAsAdmin();
    expect((await api(admin).history()).status).toBe(403);
    expect((await api(admin).send('hi')).status).toBe(403);
  });
});

describe('GET /api/me/chat', () => {
  it('chưa chat → rỗng + câu hỏi có sẵn (trả lời tĩnh)', async () => {
    const { auth } = await newCustomer();
    const res = await api(auth).history();

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      aiEnabled: true,
      maxMessageLength: env.CHAT_MAX_MESSAGE_LENGTH,
      messages: [],
      hasMore: false,
    });
    expect(res.body.data.faqs.map((faq: { id: string }) => faq.id)).toEqual([
      'shipping',
      'payment',
      'cancel',
    ]);
    expect(res.body.data.faqs[0].answer).toContain('miễn phí giao hàng');
  });

  it('phân trang lùi: cũ → mới trong trang, `before` lấy tin cũ hơn', async () => {
    const { auth, id } = await newCustomer();
    for (let i = 1; i <= 5; i++) await insertMessage(id, i % 2 ? 'USER' : 'ASSISTANT', `tin ${i}`);

    const first = await api(auth).history('?limit=2');
    expect(first.body.data.messages.map((m: { content: string }) => m.content)).toEqual([
      'tin 4',
      'tin 5',
    ]);
    expect(first.body.data.hasMore).toBe(true);

    const older = await api(auth).history(`?limit=10&before=${first.body.data.messages[0].id}`);
    expect(older.body.data.messages.map((m: { content: string }) => m.content)).toEqual([
      'tin 1',
      'tin 2',
      'tin 3',
    ]);
    expect(older.body.data.hasMore).toBe(false);
  });
});

describe('POST /api/me/chat', () => {
  it('AI trả lời thẳng → lưu câu hỏi & câu trả lời, lịch sử thấy lại', async () => {
    const { auth } = await newCustomer();
    chatWithTools.mockResolvedValueOnce(answer('Chào bạn! Bạn đang tìm sách gì?'));

    const res = await api(auth).send('  xin chào  ');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      source: 'ai',
      question: { role: 'user', content: 'xin chào', books: [] },
      answer: { role: 'assistant', content: 'Chào bạn! Bạn đang tìm sách gì?', books: [] },
    });
    // Gửi AI: system prompt + tin mới
    const sent = sentMessages(0);
    expect(sent[0].role).toBe('system');
    expect(sent.at(-1)).toEqual({ role: 'user', content: 'xin chào' });

    const history = await api(auth).history();
    expect(history.body.data.messages.map((m: { role: string }) => m.role)).toEqual([
      'user',
      'assistant',
    ]);
  });

  it('AI gọi search_books → server tìm trong DB, chỉ hiện thẻ sách công cụ đã trả', async () => {
    const { auth } = await newCustomer();
    const alchemist = await createBook({ title: 'Nhà Giả Kim', price: 79000 });
    const other = await createBook({ title: 'Đắc Nhân Tâm' }); // có trong DB nhưng công cụ không trả
    chatWithTools
      .mockResolvedValueOnce(callTool('search_books', { q: 'nhà giả kim' }))
      .mockResolvedValueOnce(
        answer(`Có cuốn **Nhà Giả Kim** nè bạn.\n[[books: ${alchemist}, ${other}, 999]]`),
      );

    const res = await api(auth).send('Có sách Nhà Giả Kim không?');

    expect(res.body.data.answer.content).toBe('Có cuốn Nhà Giả Kim nè bạn.');
    expect(res.body.data.answer.books).toEqual([
      expect.objectContaining({ id: alchemist, title: 'Nhà Giả Kim', price: 79000 }),
    ]);
    // Kết quả công cụ gửi lại AI: dạng gọn, không có ảnh
    const [result] = toolResults(1);
    expect(result.sach).toEqual([
      expect.objectContaining({
        id: alchemist,
        ten: 'Nhà Giả Kim',
        giaBan: 79000,
        tinhTrang: 'Còn hàng',
      }),
    ]);
    expect(result.sach[0].coverUrl).toBeUndefined();

    // Lịch sử đọc lại thẻ sách từ DB
    const history = await api(auth).history();
    expect(history.body.data.messages[1].books).toHaveLength(1);
  });

  it('lượt sau gửi lịch sử từ DB cho AI, câu trả lời cũ giữ [[books]]', async () => {
    const { auth } = await newCustomer();
    const book = await createBook({ title: 'Nhà Giả Kim' });
    chatWithTools
      .mockResolvedValueOnce(callTool('get_book', { bookId: book }))
      .mockResolvedValueOnce(answer(`Nhà Giả Kim còn hàng nhé\n[[books: ${book}]]`))
      .mockResolvedValueOnce(answer('Cuốn đó 300 trang ạ'));

    await api(auth).send('Nhà Giả Kim còn không?');
    await api(auth).send('Cuốn đó bao nhiêu trang?');

    const sent = sentMessages(2);
    expect(sent.slice(1)).toEqual([
      { role: 'user', content: 'Nhà Giả Kim còn không?' },
      { role: 'assistant', content: `Nhà Giả Kim còn hàng nhé\n[[books: ${book}]]` },
      { role: 'user', content: 'Cuốn đó bao nhiêu trang?' },
    ]);
  });

  it('list_my_orders (Q3): chỉ 5 đơn gần nhất, chỉ đơn của chính mình', async () => {
    const me = await newCustomer();
    const someone = await newCustomer();
    const bookId = await createBook({ stock: 50 });
    const myOrders = [];
    for (let i = 0; i < 6; i++) myOrders.push(await placeOrder(me.auth, bookId));
    const othersOrder = await placeOrder(someone.auth, bookId);
    chatWithTools
      .mockResolvedValueOnce(callTool('list_my_orders'))
      .mockResolvedValueOnce(answer('Đây là các đơn gần đây của bạn'));

    await api(me.auth).send('Đơn hàng gần đây của tôi');

    const [result] = toolResults(1);
    const codes = result.donHang.map((order: { maDon: string }) => order.maDon);
    expect(codes).toEqual(
      myOrders
        .slice(1)
        .reverse()
        .map((order) => order.code),
    );
    expect(codes).not.toContain(othersOrder.code);
    expect(result.donHang[0]).toMatchObject({
      trangThai: 'Chờ xác nhận',
      thanhToan: 'COD – Chưa thanh toán',
    });
  });

  it('tham số công cụ sai / công cụ lạ → báo lỗi cho AI, không lỗi API', async () => {
    const { auth } = await newCustomer();
    chatWithTools
      .mockResolvedValueOnce({
        content: null,
        toolCalls: [
          {
            id: 'a',
            type: 'function',
            function: { name: 'get_book', arguments: '{"bookId":"x"}' },
          },
          { id: 'b', type: 'function', function: { name: 'drop_database', arguments: '{}' } },
          {
            id: 'c',
            type: 'function',
            function: { name: 'get_book', arguments: '{"bookId":999}' },
          },
        ],
        model: 'test-model',
      })
      .mockResolvedValueOnce(answer('Mình chưa tìm thấy cuốn đó'));

    const res = await api(auth).send('Sách số x');

    expect(res.status).toBe(200);
    expect(toolResults(1)).toEqual([
      expect.objectContaining({ error: 'INVALID_ARGUMENTS' }),
      { error: 'UNKNOWN_TOOL' },
      { error: 'BOOK_NOT_FOUND' },
    ]);
  });

  it('hết CHAT_MAX_TOOL_ROUNDS vòng → lần cuối bắt AI trả lời bằng lời', async () => {
    const { auth } = await newCustomer();
    chatWithTools.mockImplementation(async (_messages, _tools, options) =>
      options?.allowTools === false ? answer('Mình trả lời luôn nhé') : callTool('list_categories'),
    );

    const res = await api(auth).send('Có những danh mục nào?');

    expect(res.body.data.answer.content).toBe('Mình trả lời luôn nhé');
    expect(chatWithTools).toHaveBeenCalledTimes(env.CHAT_MAX_TOOL_ROUNDS + 1);
    expect(chatWithTools.mock.calls.at(-1)?.[2]).toEqual({ allowTools: false });
  });

  it('AI lỗi / hết lượt → source busy, KHÔNG lưu gì', async () => {
    const { auth } = await newCustomer();
    chatWithTools.mockRejectedValueOnce(new groq.AiError('rate limited', 429));

    const res = await api(auth).send('Gợi ý sách đi');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      source: 'busy',
      question: null,
      answer: { id: null, role: 'assistant', books: [] },
    });
    expect((await api(auth).history()).body.data.messages).toEqual([]);
  });

  it('tin rỗng / quá dài → 422', async () => {
    const { auth } = await newCustomer();
    expect((await api(auth).send('   ')).status).toBe(422);
    expect((await api(auth).send('a'.repeat(env.CHAT_MAX_MESSAGE_LENGTH + 1))).status).toBe(422);
    expect((await api(auth).send(123)).status).toBe(422);
    expect(chatWithTools).not.toHaveBeenCalled();
  });

  it('chưa cấu hình GROQ_API_KEY → 503 AI_UNAVAILABLE', async () => {
    const { auth } = await newCustomer();
    const mutableEnv = env as { aiEnabled: boolean };
    mutableEnv.aiEnabled = false;
    try {
      const res = await api(auth).send('xin chào');
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('AI_UNAVAILABLE');
      expect((await api(auth).history()).body.data.aiEnabled).toBe(false);
    } finally {
      mutableEnv.aiEnabled = true;
    }
  });
});

describe('DELETE /api/me/chat & dọn tin cũ', () => {
  it('xoá cuộc trò chuyện của tôi, không ảnh hưởng người khác', async () => {
    const me = await newCustomer();
    const someone = await newCustomer();
    await insertMessage(me.id, 'USER', 'của tôi');
    await insertMessage(someone.id, 'USER', 'của người khác');

    expect((await api(me.auth).clear()).status).toBe(204);

    expect((await api(me.auth).history()).body.data.messages).toEqual([]);
    expect((await api(someone.auth).history()).body.data.messages).toHaveLength(1);
  });

  it('job xoá tin cũ hơn CHAT_RETENTION_DAYS ngày', async () => {
    const { auth, id } = await newCustomer();
    await insertMessage(id, 'USER', 'tin mới');
    await pool.query(
      `INSERT INTO chat_messages (user_id, role, content, created_at)
       VALUES ($1, 'USER', 'tin cũ', now() - make_interval(days => $2))`,
      [id, env.CHAT_RETENTION_DAYS + 1],
    );

    expect(await purgeOldMessages()).toBe(1);
    const messages = (await api(auth).history()).body.data.messages;
    expect(messages.map((m: { content: string }) => m.content)).toEqual(['tin mới']);
  });
});
