import {
  buildSystemPrompt,
  buildToolDefinitions,
  historyToMessages,
  languageHint,
  looksEnglish,
  parseAssistantReply,
} from '../../../src/lib/ai/chat-prompt';

// M16 – prompt chatbox + đọc câu trả lời AI (docs/03-modules/16-chatbox.md mục 6)

const allowed = new Map([
  [12, 'Nhà Giả Kim'],
  [15, 'Hiểu Về Trái Tim'],
  [20, 'Đắc Nhân Tâm'],
]);

describe('parseAssistantReply', () => {
  it('tách dòng [[books: …]] → id theo thứ tự, bỏ dòng đó khỏi câu trả lời', () => {
    const result = parseAssistantReply(
      'Mình gợi ý 2 cuốn:\n- Hiểu Về Trái Tim\n- Nhà Giả Kim\n[[books: 15, 12]]',
      allowed,
      5,
    );
    expect(result).toEqual({
      text: 'Mình gợi ý 2 cuốn:\n- Hiểu Về Trái Tim\n- Nhà Giả Kim',
      bookIds: [15, 12],
    });
  });

  it('id không có trong kết quả công cụ / trùng → bỏ; tối đa `limit` cuốn', () => {
    const result = parseAssistantReply('Xem nhé [[books: 999, 12, 12, 15, 20]]', allowed, 2);
    expect(result.bookIds).toEqual([12, 15]);
  });

  it('AI quên dòng [[books]] → lấy sách công cụ vừa trả có tên trong câu trả lời', () => {
    const result = parseAssistantReply('Bạn thử đọc "đắc nhân tâm" nhé!', allowed, 5);
    expect(result.bookIds).toEqual([20]);
  });

  it('có dòng [[books]] rỗng → không hiện thẻ nào (không đoán theo tên)', () => {
    const result = parseAssistantReply('Nhà Giả Kim đã hết hàng ạ. [[books: ]]', allowed, 5);
    expect(result).toEqual({ text: 'Nhà Giả Kim đã hết hàng ạ.', bookIds: [] });
  });

  it('bỏ Markdown còn sót (**đậm**, # tiêu đề), gộp dòng trống thừa', () => {
    const result = parseAssistantReply('# Gợi ý\n\n\n\n**Nhà Giả Kim** rất hay', new Map(), 5);
    expect(result.text).toBe('Gợi ý\n\nNhà Giả Kim rất hay');
  });
});

describe('historyToMessages', () => {
  it('USER → user · ASSISTANT → assistant, giữ dòng [[books]] để AI biết cuốn nào đã hiện', () => {
    expect(
      historyToMessages([
        { role: 'USER', content: 'Có sách trinh thám không?', bookIds: [] },
        { role: 'ASSISTANT', content: 'Có 2 cuốn nè', bookIds: [12, 15] },
        { role: 'ASSISTANT', content: 'Chào bạn', bookIds: [] },
      ]),
    ).toEqual([
      { role: 'user', content: 'Có sách trinh thám không?' },
      { role: 'assistant', content: 'Có 2 cuốn nè\n[[books: 12, 15]]' },
      { role: 'assistant', content: 'Chào bạn' },
    ]);
  });
});

describe('buildSystemPrompt / buildToolDefinitions', () => {
  it('nêu phạm vi, câu từ chối, giới hạn đơn hàng, dạng [[books]]', () => {
    const prompt = buildSystemPrompt({ searchLimit: 5, orderLimit: 5 });
    expect(prompt).toContain('chỉ hỗ trợ về sách, đơn hàng và mua sắm');
    expect(prompt).toContain('5 đơn gần nhất');
    expect(prompt).toContain('[[books: id1, id2]]');
    expect(prompt).toContain('tuyệt đối không bịa');
  });

  it('chỉ có công cụ chỉ-đọc, không có công cụ tra đơn theo mã (Q3)', () => {
    const names = buildToolDefinitions().map((tool) => tool.function.name);
    expect(names).toEqual([
      'search_books',
      'get_book',
      'list_categories',
      'get_store_policy',
      'recommend_for_me',
      'list_my_orders',
    ]);
  });
});

describe('looksEnglish / languageHint (Q8 – trả lời theo ngôn ngữ khách)', () => {
  it.each([
    ['Do you have any detective novels?', true],
    ['What books do you recommend for me?', true],
    ['Có sách trinh thám không?', false],
    ['co sach trinh tham khong', false], // tiếng Việt gõ không dấu
    ['ok', false],
    ['Nhà Giả Kim', false],
  ])('%s → %s', (text, expected) => {
    expect(looksEnglish(text)).toBe(expected);
  });

  it('tin tiếng Anh → thêm nhắc trả lời tiếng Anh, tiếng Việt → không', () => {
    expect(languageHint('Do you have any novels?')).toMatchObject({ role: 'system' });
    expect(languageHint('Có tiểu thuyết không?')).toBeNull();
  });
});
