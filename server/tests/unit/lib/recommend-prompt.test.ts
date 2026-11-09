import {
  buildRecommendMessages,
  parseRecommendResponse,
} from '../../../src/lib/ai/recommend-prompt';

// M15 – kiểm tra kết quả AI: chỉ giữ sách có thật trong danh sách ứng viên

const candidateIds = [1, 2, 3, 4];

const parse = (content: unknown, size = 8, maxReason = 200) =>
  parseRecommendResponse(
    typeof content === 'string' ? content : JSON.stringify(content),
    candidateIds,
    size,
    maxReason,
  );

describe('parseRecommendResponse', () => {
  it('giữ đúng thứ tự AI chọn, id dạng chuỗi số vẫn nhận', () => {
    const picks = parse({
      items: [
        { bookId: 3, reason: 'Hợp gu tâm lý' },
        { bookId: '1', reason: 'Cùng tác giả bạn thích' },
      ],
    });
    expect(picks).toEqual([
      { bookId: 3, reason: 'Hợp gu tâm lý' },
      { bookId: 1, reason: 'Cùng tác giả bạn thích' },
    ]);
  });

  it('bỏ sách KHÔNG có trong danh sách ứng viên (AI bịa) và sách trùng', () => {
    const picks = parse({
      items: [
        { bookId: 999, reason: 'Sách bịa' },
        { bookId: 2, reason: 'Lần 1' },
        { bookId: 2, reason: 'Lần 2' },
        { bookId: 4, reason: 'Ok' },
      ],
    });
    expect(picks.map((p) => p.bookId)).toEqual([2, 4]);
    expect(picks[0].reason).toBe('Lần 1');
  });

  it('chỉ lấy tối đa số sách cần gợi ý', () => {
    const items = candidateIds.map((bookId) => ({ bookId, reason: 'Hay' }));
    expect(parse({ items }, 2)).toHaveLength(2);
  });

  it('cắt lý do quá dài, gộp khoảng trắng', () => {
    const [pick] = parse(
      { items: [{ bookId: 1, reason: `  Rất   hay ${'a'.repeat(50)}` }] },
      8,
      20,
    );
    expect(pick.reason.length).toBeLessThanOrEqual(20);
    expect(pick.reason.endsWith('…')).toBe(true);
    expect(pick.reason.startsWith('Rất hay')).toBe(true);
  });

  it('JSON hỏng / sai dạng / lý do rỗng → []', () => {
    expect(parse('không phải json')).toEqual([]);
    expect(parse({ books: [] })).toEqual([]);
    expect(parse({ items: [{ bookId: 1, reason: '' }] })).toEqual([]);
    expect(parse({ items: 'abc' })).toEqual([]);
  });
});

describe('buildRecommendMessages', () => {
  it('gửi hồ sơ + ứng viên, không có thông tin cá nhân; nhắc chỉ chọn theo id', () => {
    const [system, user] = buildRecommendMessages(
      {
        categories: ['Sách Tâm Lý'],
        authors: ['Nguyễn Nhật Ánh'],
        note: 'nhẹ nhàng',
        likedTitles: [],
      },
      [
        {
          id: 7,
          title: 'Hiểu Về Trái Tim',
          authors: 'Minh Niệm',
          category: 'Tâm lý',
          description: '',
        },
      ],
      5,
    );
    expect(system.role).toBe('system');
    expect(system.content).toContain('CHỈ chọn sách có trong danh sách ứng viên');
    expect(system.content).toContain('tối đa 5 cuốn');
    const data = JSON.parse(user.content);
    expect(data.danhSachUngVien).toEqual([
      { id: 7, ten: 'Hiểu Về Trái Tim', tacGia: 'Minh Niệm', theLoai: 'Tâm lý', moTa: null },
    ]);
    expect(data.soThichCuaKhach.moTaCuaKhach).toBe('nhẹ nhàng');
  });
});
